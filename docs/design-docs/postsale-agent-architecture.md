# Design Doc: Postsale Agent EVAPREMIUM V1 — Architecture

Status: Accepted
Owner: Human Architect
Created: 2026-06-17
Last updated: 2026-06-17

Linked product spec: `docs/product-specs/postsale-agent-v1.md`
Linked ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`

Readiness: BOUNDARIES_WORKFLOW_READY, MODULES_RELIABILITY_READY

## System Overview

Postsale Agent EVAPREMIUM V1 is a NestJS-owned post-sale information collection workflow triggered by Bitrix deal stage changes, backed by Supabase, with Langflow for controlled AI tasks and n8n for external triggers and timers.

```text
Bitrix24 ──► n8n ──► NestJS API ──► Supabase (source of truth)
                │         │
                │         ├──► Langflow (classify, draft, analyze)
                │         ├──► Email provider (customer)
                │         ├──► Bitrix24 (stage, comments)
                │         └──► Telegram (operator alerts)
                │
                └──► inbound email webhooks ──► NestJS
```

## Technology Context

| Layer | Choice |
| --- | --- |
| Application type | backend (+ automation adapters) |
| Framework | NestJS |
| Language | TypeScript |
| Runtime | Node.js |
| Persistence | Supabase / PostgreSQL |
| AI module | Langflow (controlled tools, no direct side effects) |
| Automation | n8n (triggers, timers, email ingress forwarding) |
| CRM | Bitrix24 |
| Customer channel | Email (V1) |
| Operator channel | Telegram (V1) |
| Testing | unit + integration + policy tests; runtime validation evidence |
| Deployment target | OPEN_DECISION (see `docs/open-decisions.md`) |

## Stable Codemap (target)

```text
src/
  domains/
    postsale-workflows/
      types/
      schemas/
      config/
      repository/
      services/
      use-cases/
      policies/
    requirements/
    langflow/
    email/
    bitrix/
    telegram/
    audit/
    idempotency/
    side-effects/
  app/
    modules/
  api/
    controllers/
    dto/
    parsers/
  integrations/
    langflow/
    bitrix/
    email/
    telegram/
    supabase/
  lib/
  tests/
    unit/
    integration/
    policies/
docs/
  product-specs/postsale-agent-v1.md
  design-docs/postsale-agent-*.md
  exec-plans/active/postsale-agent-v1.md
  tasks/
```

## Domain Layers

Default dependency direction per `ARCHITECTURE.md`:

```text
types/schemas
→ config
→ repository/ports
→ services / policies
→ use-cases
→ runtime/adapters (integrations)
→ API controllers
```

Rule: **Controller → UseCase → Service/Policy → Repository/Integration**

No business logic in controllers, repositories, integration clients, n8n workflows, or Langflow prompts.

## NestJS Modules

| Module | Responsibility |
| --- | --- |
| postsale-workflows | Workflow lifecycle, completion policy, orchestration; match step stub (`template_mapping_not_implemented`) |
| requirements | Requirement CRUD, evidence linkage, status rules |
| langflow | Flow invocation, output parsing, validation |
| email | Draft validation gate, outbound send, inbound normalization |
| bitrix | Deal read, stage update, comment create |
| telegram | Operator notifications |
| audit | workflow_events emission |
| idempotency | Duplicate trigger prevention |
| side-effects | side_effect_records, execute-after-validate |

## Providers

| Provider | Implementation |
| --- | --- |
| auth | NestJS guards / API keys for n8n webhooks |
| CRM/connectors | BitrixProvider → bitrix adapter |
| telemetry | Structured logs, workflow_event correlation IDs |
| feature flags | Optional V1 config module |
| LLM | LangflowProvider → langflow adapter |
| messaging | EmailProvider, TelegramProvider |
| payments | Not used in V1 |

## Database Tables (V1)

**2026-06-24:** wide `car_templates` **restored** (`20260624100000_recreate_car_templates_wide.sql`). `postsale_workflows.car_template_id` references matched template. `car_template_notes` / `template_import_batches` remain dropped; notes live in `notes_*` columns on `car_templates`.

**2026-06-23:** `template_import_batches`, `car_templates`, `car_template_notes` removed (`20260623120000_drop_car_templates.sql`) — superseded by wide layout 2026-06-24.

| Table | Purpose |
| --- | --- |
| car_templates | EVAMATS wide template rows + `notes_*` text (V1 match source) |
| postsale_workflows | Workflow aggregate root |
| workflow_requirements | Classified requirements per workflow |
| customer_messages | Inbound/outbound message records |
| message_attachments | Email attachments |
| message_links | Links extracted from email body |
| requirement_evidence | Evidence linked to requirements |
| langflow_runs | AI invocation audit |
| outgoing_messages | Sent email audit |
| workflow_events | Historical audit events |
| side_effect_records | Idempotent side effect tracking |
| idempotency_keys | Duplicate prevention |

## Status vs Events

WorkflowStatus and WorkflowEventType are separate enums. Do not merge.

### WorkflowStatus

STARTED, CONTEXT_LOADED, TEMPLATE_MATCHED, REQUIREMENTS_CREATED, WAITING_FOR_CUSTOMER_REPLY, REQUIREMENTS_UPDATED, COMPLETION_PENDING_BITRIX_UPDATE, COMPLETED, ESCALATED, FAILED

### WorkflowEventType

WORKFLOW_STARTED, DEAL_CONTEXT_LOADED, TEMPLATE_MATCH_SUCCEEDED, REQUIREMENTS_CLASSIFIED, WORKFLOW_REQUIREMENTS_CREATED, INITIAL_EMAIL_SENT, CUSTOMER_REPLY_RECEIVED, REPLY_ANALYSIS_ACCEPTED, REQUIREMENT_STATUSES_UPDATED, COMPLETION_POLICY_PASSED, BITRIX_STAGE_UPDATE_SUCCEEDED, WORKFLOW_COMPLETED, WORKFLOW_ESCALATED

## Boundary Parsing

| Boundary | Parser owner | Trusted output | Invalid input |
| --- | --- | --- | --- |
| n8n workflow start | API DTO parser | StartWorkflowCommand | 400, no workflow |
| n8n email inbound | email parser | IngestReplyCommand | escalate if unmatched |
| Bitrix deal read | bitrix mapper | DealContext value object | escalation if insufficient |
| Langflow classify | langflow schema parser | ClassifiedRequirementDraft[] | escalate if unsafe/low confidence |
| Langflow email draft | langflow schema parser | EmailDraft value object | reject send |
| Langflow reply analysis | langflow schema parser | ReplyAnalysisResult | follow-up or escalate |

## Side Effects Model

All side effects require `side_effect_record` before execution.

| Side effect type | Idempotency key source |
| --- | --- |
| SEND_INITIAL_EMAIL | workflow_id + type |
| SEND_FOLLOWUP_EMAIL | workflow_id + attempt |
| UPDATE_BITRIX_STAGE_TO_COMPLETED | workflow_id + target stage |
| UPDATE_BITRIX_STAGE_TO_ESCALATED | workflow_id + target stage |
| CREATE_BITRIX_COMMENT | workflow_id + comment hash |
| SEND_TELEGRAM_NOTIFICATION | workflow_id + notification type |

Telegram failure does not block COMPLETED when Bitrix completion succeeded.

## Retry Policy

Retry (technical): Langflow timeout, email/Bitrix/Telegram temporary failures.

No retry (business uncertainty): template not found/ambiguous, unsafe notes, confidence < 0.75, unsafe reply classification.

## Forbidden Dependency Edges

- Use-case → external SDK directly
- Langflow → Supabase / Bitrix / email / Telegram
- n8n → Bitrix stage write without NestJS
- Raw LLM output → Domain or Persistence model

## Integration Boundaries

**n8n:** triggers, timers, email forwarding only. No completion validation, no Supabase writes, no Bitrix stage updates.

**Langflow:** classify, draft, analyze, propose only. No direct side effects.

**NestJS:** all business rules, policies, persistence, validated side effects.

## Orchestration vs Agent Loop (evolution)

V1 process map describes **linear deterministic orchestration**: n8n triggers NestJS use cases in a fixed order; Langflow is invoked for specific AI steps only.

Future **capability decomposition** and **workflow-wide agent loops** (level B) are documented separately and are not V1 deliverables:

- `docs/design-docs/postsale-agent-capabilities-agent-loop.md` — split `StartWorkflowUseCase` into guarded capabilities, agent loop semantics, termination contract
- `docs/open-decisions.md` — OD-008, OD-009, OD-010

V1 invariant unchanged: no direct side-effect tools from Langflow or external agents; NestJS owns state transitions after policy validation.
