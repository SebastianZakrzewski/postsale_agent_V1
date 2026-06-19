# Design Doc: Postsale Agent — Capability Decomposition & Agent Loop Evolution

Status: Draft (architecture direction; not V1 scope)
Owner: Human Architect (pending acceptance)
Created: 2026-06-19
Last updated: 2026-06-19

Linked product spec: `docs/product-specs/postsale-agent-v1.md`
Linked architecture: `docs/design-docs/postsale-agent-architecture.md`
Linked Langflow tools: `docs/design-docs/postsale-agent-langflow-tools.md`
Open decisions: `docs/open-decisions.md` (OD-008, OD-009, OD-010)

## Purpose

Document how the current deterministic orchestration in `StartWorkflowUseCase` can evolve into **discrete capabilities** invokable by an **agent loop** (observe → think → tool → repeat → finish), without breaking V1 safety rules (NestJS owns side effects, Langflow proposes only).

V1 **excludes** full multi-agent orchestration over the whole workflow (see decision log). This doc describes the **evolution path** for V2/V3.

## Current State (V1 baseline)

Today, workflow start is a **monolithic use case**:

```text
POST /webhooks/workflow/start
  → StartWorkflowUseCase.execute()
       idempotency
     → create workflow (STARTED)
     → Bitrix read + parse (CONTEXT_LOADED)
     → MatchTemplateUseCase (TEMPLATE_MATCHED | escalate)
     → EscalateWorkflowUseCase / FailWorkflowUseCase on failure paths
```

n8n triggers the **full sequence** in one HTTP call. Individual steps (`MatchTemplateUseCase`, `EscalateWorkflowUseCase`, `FailWorkflowUseCase`) exist but are primarily composed **inside** start, not exposed as separate external capabilities.

Future tasks (05–08) add more orchestration inside NestJS use cases, still mostly **deterministic** rather than agent-driven.

## Target: Two Levels of Agent Loop

| Level | Scope | Runtime owner (TBD — OD-008) | V1 |
| --- | --- | --- | --- |
| **A — Task-local loop** | Single AI step (classify, draft, analyze reply) | Langflow flow with approved tools | Yes (task-05–07) |
| **B — Workflow-wide loop** | Entire post-sale collection for one deal | Langflow, NestJS turn runner, or external MCP agent | No (V3 candidate) |

Both levels share the same principle from `postsale-agent-langflow-tools.md`:

```text
Agent / Langflow → read + propose + request (controlled)
NestJS → validate + persist + side effects + status transitions
```

Forbidden: direct side-effect tools from the agent (send email, update Bitrix, mark complete, write DB).

## Capability Model (decompose monolith)

A **capability** is one externally invokable unit backed by a **single use case** (or thin orchestrator), with:

- explicit **preconditions** (`WorkflowStatus` + policy),
- **idempotency** scope for mutating operations,
- **audit events**,
- response including **`allowed_next_actions`** (OD-010).

### Capability map

| Capability | Use case (target) | Preconditions (draft) | Mutates? | V1 |
| --- | --- | --- | --- | --- |
| `start_workflow` | `StartWorkflowUseCase` (thin orchestrator) | new deal trigger | yes | Yes (task-04) |
| `load_deal_context` | `LoadDealContextUseCase` (extract from start) | STARTED | yes | Internal only |
| `match_template` | `MatchTemplateUseCase` + guard | CONTEXT_LOADED | yes | Internal only |
| `create_requirements` | task-05 | TEMPLATE_MATCHED | yes | Planned |
| `send_initial_email` | task-05 | REQUIREMENTS_CREATED | yes | Planned |
| `ingest_customer_reply` | task-06 | WAITING_FOR_CUSTOMER_REPLY | yes | Planned |
| `analyze_reply` | task-06 (Langflow + parser) | reply ingested | yes | Planned |
| `complete_workflow` | task-07 + CompletionPolicy | policy pass | yes | Planned |
| `escalate_workflow` | `EscalateWorkflowUseCase` | policy / failure | yes | Partial |
| `fail_workflow` | `FailWorkflowUseCase` | technical failure | yes | Partial |
| `get_workflow_context` | read service | any non-terminal | no | Langflow tool (design) |
| `get_workflow_requirements` | read service | any | no | Langflow tool (design) |

`StartWorkflowUseCase` after decomposition:

```text
start_workflow =
  idempotency + create workflow
  + load_deal_context
  + match_template
  (+ escalate/fail on error paths)
```

n8n keeps calling **`start_workflow` only** in production V1. Agent loop (level B) calls **individual capabilities** when recovery, replay, or autonomous orchestration is needed.

## WorkflowStateGuard

Before any mutating capability (except `start_workflow` create path):

```text
request → WorkflowStateGuard(capability, workflow.status)
  → allowed: execute use case
  → denied: 422 + { status, reason, allowed_next_actions[] }
```

Draft precondition matrix (Human Architect to confirm — OD-009):

| Current status | Allowed capabilities |
| --- | --- |
| STARTED | `load_deal_context`, `fail_workflow` |
| CONTEXT_LOADED | `match_template`, `escalate_workflow`, `fail_workflow` |
| TEMPLATE_MATCHED | `create_requirements`, `escalate_workflow` |
| REQUIREMENTS_CREATED | `send_initial_email`, `escalate_workflow` |
| WAITING_FOR_CUSTOMER_REPLY | `ingest_customer_reply` (event-driven); read tools |
| REQUIREMENTS_UPDATED | `analyze_reply`, completion/followup path |
| COMPLETED / ESCALATED / FAILED | read tools only; **hard stop** for agent loop |

## Agent Loop Semantics

### Loop (level B — workflow-wide)

```text
goal: close workflow for deal X (complete | escalate | fail)

while not done:
  context ← read tools (status, requirements, messages)
  decision ← agent chooses next capability OR propose_* (Langflow)
  result ← NestJS executes capability (after guard + policy)
  done ← terminal status OR soft_stop (waiting for customer)

return final status
```

### Termination contract (OD-010)

| Signal | Agent behavior |
| --- | --- |
| `status ∈ { COMPLETED, ESCALATED, FAILED }` | **Hard stop** — end loop |
| `WAITING_FOR_CUSTOMER_REPLY` | **Soft stop** — end turn; resume on email webhook or timer |
| `propose_completion` rejected | Continue loop (follow-up, manual review, read more context) |
| `allowed_next_actions: []` with non-terminal status | Treat as bug / escalate to operator |

Every mutating capability response should include (draft):

```text
workflow_id, status, done (boolean), soft_stop (boolean),
allowed_next_actions[], audit_event_ids[], error_code?
```

### Idempotency per tool call

| Capability | Suggested idempotency scope |
| --- | --- |
| `start_workflow` | `start_workflow` + key (existing) |
| `load_deal_context` | `workflow_id + load_context` |
| `match_template` | `workflow_id + match_template` |
| `send_initial_email` | side_effect_record (existing model) |
| Langflow classify/draft/analyze | `langflow_runs` + input_hash |

Agent retries must not duplicate emails, Bitrix updates, or requirements.

## Langflow Tools vs NestJS Capabilities

From `postsale-agent-langflow-tools.md`:

| Tool category | Who executes | Agent loop role |
| --- | --- | --- |
| Read tools | NestJS serves data to Langflow | Observation in loop |
| AI task tools | Langflow flows | Reasoning step |
| Proposal tools | Langflow proposes; NestJS validates | Decision proposal |
| Controlled request tools | NestJS use cases | Mutating action after policy |

Level **A** loop: Langflow agent inside `analyze_customer_reply` calls read tools, then `propose_completion | propose_followup | propose_manual_review`.

Level **B** loop: external or NestJS-hosted agent calls **HTTP/MCP capabilities** (`match_template`, `send_initial_email`, …) in addition to Langflow AI steps.

## API / MCP Surface (future)

Draft routes (not implemented in V1):

```text
POST /capabilities/start-workflow
POST /capabilities/load-deal-context
POST /capabilities/match-template
POST /capabilities/create-requirements
POST /capabilities/send-initial-email
POST /capabilities/complete-workflow
POST /capabilities/escalate-workflow
GET  /capabilities/workflow-context/:workflowId
```

Alternative: MCP server wrapping the same use cases for Cursor/external parent agents (OD-008).

Auth: same webhook secret or dedicated agent API key; audit all agent-initiated mutations.

## Implementation Phases

| Phase | Deliverable | Blocks V1? |
| --- | --- | --- |
| **V1 (task-04–09)** | Deterministic use cases; Langflow level-A loops; `StartWorkflowUseCase` may remain orchestrator for start | No |
| **V1 refactor hygiene** | Implement task-05+ as **standalone** use cases; avoid adding steps only inside start monolith | No |
| **V2** | Extract `LoadDealContextUseCase`; `WorkflowStateGuard`; read API + `allowed_next_actions`; optional capability HTTP routes for recovery | No |
| **V3** | Workflow-wide agent loop (level B); MCP; multi-agent orchestration per ExecPlan | Yes — new ExecPlan |

## Tech Debt Link

See `docs/exec-plans/tech-debt-tracker.md` — **TD-ARCH-005** (StartWorkflowUseCase monolith decomposition).

## Related Open Decisions

- **OD-008** — Agent loop runtime ownership (Langflow vs NestJS vs external MCP)
- **OD-009** — Capability decomposition timeline and guard matrix approval
- **OD-010** — Agent termination and capability response contract
