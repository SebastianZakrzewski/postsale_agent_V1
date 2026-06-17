ExecPlan: [Plan Name]

Status: Draft | Active | Blocked | Completed
Owner: [Human / team / agent role]
Risk level: Low | Medium | High
Created: YYYY-MM-DD
Last updated: YYYY-MM-DD

## Purpose

Explain the initiative, why it matters, and how success is proven.

Business goal:
Success criteria:
Must-never-happen:

## Context

Summarize relevant product, architecture, and business context.

Required source-of-truth docs:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/agents/runtime-strategy.md`
- `docs/product-specs/...`
- `docs/design-docs/...`
- `docs/decision-log.md`
- `docs/open-decisions.md`

Relevant code areas:

- ...

Relevant Linear project/issues:

- ...

## Technology Context

Application type:

- ...

Framework/runtime:

- ...

Language:

- ...

Persistence:

- ...

Integrations:

- ...

Testing/runtime validation tools:

- ...

Deployment target:

- ...

Technology assumptions:

- ...

Technology OPEN_DECISIONs:

- ...

## Mode / Risk Level

Mode depth: FAST | STANDARD | DEEP
Codex Audit required: YES/NO
Runtime Validation required: YES/NO

## Readiness Gates

Real project ExecPlans must record current Architect readiness.

Ladder:

```text
ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC
→ BUSINESS_PROCESS_MAPPING_DRAFT
→ BUSINESS_PROCESS_MAPPING_READY
→ ARCH_READY_FOR_TASK_DESIGNER
→ ARCH_READY_FOR_IMPLEMENTATION
```

Current status:

- `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC`: MET / NOT MET
- `BUSINESS_PROCESS_MAPPING_DRAFT`: MET / NOT MET
- `BUSINESS_PROCESS_MAPPING_READY`: MET / NOT MET
- `ARCH_READY_FOR_TASK_DESIGNER`: MET / NOT MET
- `ARCH_READY_FOR_IMPLEMENTATION`: MET / NOT MET

Linked product spec:

- path: `docs/product-specs/...` or `none (harness-only / documentation-only)`
- status: Draft | Approved | missing

Implementation status:

- BLOCKED | READY FOR TASK DESIGNER | READY FOR IMPLEMENTATION

Risk classification:

- CRM writes: YES/NO
- customer messaging: YES/NO
- pricing/payments: YES/NO
- auth/security: YES/NO
- database migrations: YES/NO
- state changes: YES/NO
- external integrations: YES/NO
- production data/automation: YES/NO
- LLM business behavior: YES/NO
- architecture boundaries: YES/NO

## Source Of Truth

This ExecPlan is the planning source of truth for the initiative. Implementation truth remains in `docs/tasks/`, accepted decisions in `docs/decision-log.md`, architecture rules in `ARCHITECTURE.md`, product behavior in `docs/product-specs/`, and tests/code behavior. Linear tracks status only.

## V1 Scope

Define what is included in V1.

V1 includes:

* ...

V1 excludes:

* ...

V1 must not include deferred V2/V3 work unless required for safety, core business value, or compliance.

## Deferred V2/V3

Document explicitly deferred work.

V2 candidates:

* ...

V3 candidates:

* ...

Deferred work must not be implemented in V1 tasks unless Human Architect updates the plan.

## Architecture Summary

Summarize the chosen architecture.

Domains:

- ...

Default domain layers:

```text
types/schemas
-> config
-> repository/ports
-> services
-> use-cases
-> runtime/adapters
-> API/UI
```

Providers:

- auth:
- CRM/connectors:
- telemetry:
- feature flags:
- LLM:
- messaging:
- payments:

Forbidden dependency edges:

- ...

Boundary parsing requirements:

- ...

## Repo Task List

Each ExecPlan must include a Repo task list.

The Repo task list must link to all implementation-ready repo tasks created from:

`docs/tasks/_template.md`

Each repo task must link back to the ExecPlan.

Linear issues may track task status, but the repo task remains implementation source of truth.

- task-001 - [title] - status: pending
- task-002 - [title] - status: pending
- task-003 - [title] - status: pending

## Dependencies

List dependencies that affect execution.

Documentation dependencies:

* ...

Technical dependencies:

* ...

Business dependencies:

* ...

External dependencies:

* ...

Blocking dependencies:

* ...

## Progress

Update during execution.

- [pending] task-001 - ...
- [in progress] task-002 - ...
- [done] task-003 - ...
- [blocked] task-004 - blocked by OD-...

## Surprises & Discoveries

Record facts discovered during implementation, such as existing code behavior, adapter/doc drift, available test coverage, or runtime validation findings.

- ...

## Decision Log

Record accepted decisions made during this plan.

```text
YYYY-MM-DD — Decision — Rationale — Owner
```

Accepted decisions:

* ...

Do not record unresolved decisions here. Use `OPEN_DECISIONs`.

Accepted decisions must also be reflected in `docs/decision-log.md`.

## OPEN_DECISIONs

Blocking:

* ...

Non-blocking:

* ...

If none:

```text
None.
```

Blocking `OPEN_DECISIONs` must be resolved by Human Architect before implementation.

Each blocking decision must also appear in `docs/open-decisions.md`.

## Validation

Define how completion is proven.

Required checks:

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

Additional checks:

```bash
bash ./scripts/architecture-check
bash ./scripts/docs-check
bash ./scripts/tasks-check
bash ./scripts/plans-check
```

Acceptance validation:

- ...

Forbidden behavior validation:

- ...

Regression validation:

- ...

## Runtime Evidence

Required when Runtime Validation = YES. If runtime validation cannot run, explain why and mark the result as not fully verified.

Evidence to collect:

- Playwright test:
- Chrome DevTools MCP check:
- screenshot / DOM snapshot:
- API check:
- network check:
- no-console-error check:
- sandbox/mock integration check:
- structured log/audit event:
- trace/request/workflow ID:
- idempotency evidence:

## Linear Mapping

Linear Project:

- name:
- link:
- owner:
- priority:
- status:

Linear Issues:

- SG-001 -> `docs/tasks/task-001.md` -> PR TBD -> Review pending

## Risks

Known risks:

- ...

Mitigations:

- ...

Residual risk after V1:

- ...

## Outcomes & Retrospective

Fill when the plan is completed or closed.

What shipped:

- ...

What was deferred:

- ...

What changed from original plan:

- ...

Validation result:

- ...

Codex Audit result:

- ...

QA result:

- ...

Lessons learned:

- ...

Follow-up tech debt:

- ...
