# Task: Cross-Cutting — Idempotency, Audit Events, Side-Effect Records

Status: Done  
Stage: Domain | Use Case | Persistence  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-76](https://linear.app/sellgenius-dev/issue/SEL-76)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`.

## Context

Why this task exists:

- Business: Every workflow side effect and duplicate Bitrix trigger must be safe, auditable, and idempotent before CRM or customer messaging code lands.
- Technical: task-01 created schema and module skeleton; this task implements the three cross-cutting domains.
- Current behavior: Empty module stubs and tables without use-case logic.
- Target behavior: Reusable services for idempotency checks, workflow_events emission, and side_effect_record lifecycle (pending → succeeded / failed).

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase / PostgreSQL (idempotency_keys, workflow_events, side_effect_records)

Integrations:

- none (internal services only in this task)

Testing/runtime validation tools:

- Jest unit and integration tests
- Supabase test DB or mocked repositories

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-01 schema and module skeleton exist
- DB unique constraint on idempotency_key

Technology OPEN_DECISIONs:

- None specific to this task

## Goal

Expected result:

- `IdempotencyService.checkAndRecord()` prevents duplicate keys
- `AuditService.emit()` writes workflow_events with WorkflowEventType
- `SideEffectService.record()` creates side_effect_record before execution; `markSucceeded` / `markFailed` with retry metadata
- Repository implementations for idempotency_keys, workflow_events, side_effect_records

Complete when:

- Unit tests cover duplicate idempotency key rejection
- Side effect cannot execute without prior record (guard/helper enforced)
- workflow_events written with workflow_id, status_before, status_after fields

## Scope

Allowed changes:

- `src/domains/idempotency/` — use cases, service, Supabase repository
- `src/domains/audit/` — AuditService, workflow_events repository
- `src/domains/side-effects/` — SideEffectService, SideEffectType enum, status machine
- Shared types for correlation IDs (workflow_id, request_id, idempotency_key)
- Tests for the three modules

Likely files/areas:

- `src/domains/idempotency/use-cases/check-idempotency.use-case.ts`
- `src/domains/side-effects/services/side-effect.service.ts`
- `src/domains/audit/services/audit.service.ts`
- `src/domains/*/repository/*.repository.ts`

## Forbidden Scope

Do not change:

- Product spec business rules
- Database table shapes from task-01 (additive indexes OK)
- Workflow completion or escalation policies

Do not implement:

- Bitrix, email, Telegram, Langflow calls
- Workflow business orchestration (task-04)
- HTTP controllers (internal services only)

Do not touch:

- n8n or Langflow external configuration
- `.harness/stack.env` unless required by task-01 follow-up

## Business Behavior

Expected:

- Same idempotency_key twice → second call returns duplicate without new side effects
- Every side_effect_record created with status pending before external call
- WorkflowEventType used for events; WorkflowStatus used for workflow state (never merged)

Forbidden:

- Executing side effect without side_effect_record
- Using WorkflowStatus values in workflow_events.event_type

Edge cases:

- Concurrent duplicate idempotency insert → one wins, one gets duplicate response (DB unique constraint)

## Technical Requirements

Implementation:

- CheckIdempotencyUseCase, RecordSideEffectUseCase, EmitWorkflowEventUseCase
- Side-effect guard/helper used by future integration tasks
- Retry metadata on side_effect_records (retry_allowed, error_code)

Architecture:

- Controller → UseCase → Service → Repository (no controller in this task)
- No external SDK imports in use-cases

Model separation:

- DTO: none (internal commands only)
- Command: `CheckIdempotencyCommand`, `RecordSideEffectCommand`, `EmitWorkflowEventCommand`
- Domain: `IdempotencyResult`, `SideEffectRecord`, `WorkflowEvent`
- Persistence: row types and mappers for three tables
- Integration Payload: none in this task
- LLM Output: none in this task

Boundary parsing:

- input source: internal Command objects from use-cases
- parser/schema/mapper: domain mappers from persistence rows
- trusted output type: Domain entities
- failure mode: domain errors; no external side effects
- forbidden side effects before parse: N/A (no external boundaries in this task)

Providers:

- auth: none in this task
- CRM/connectors: none
- telemetry: LoggerModule / structured log fields
- feature flags: none
- LLM: none
- messaging: none
- payments: none

## State Changes

Allowed:

- Writes to idempotency_keys, workflow_events, side_effect_records

Forbidden:

- postsale_workflows status transitions (task-04+)
- Any external CRM, email, or messaging side effects

Side effects:

- None external in this task

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: duplicate idempotency key rejected
- unit: side effect guard throws if no pending record
- integration: audit event persisted with correct WorkflowEventType
- regression: harness-check still passes after module wiring
- forbidden behavior: side effect execution blocked without pending record
- edge case: concurrent idempotency key insert handled safely

Test format:

```text
Given: idempotency_key already recorded for deal X
When: CheckIdempotencyUseCase runs again with same key
Then: returns duplicate=true, no new workflow created
Forbidden side effect: any external integration call
```

## Runtime Validation

Runtime Validation: NO

If YES, evidence required: N/A

If NO, reason:

- Internal services only; runtime evidence for idempotency and side effects validated in task-09 policy suite.

## Acceptance Criteria

- IdempotencyService with duplicate detection tested
- SideEffectService enforces record-before-execute pattern
- AuditService emits typed WorkflowEventType events
- Repositories wired to Supabase
- `npm run test`, `npm run lint`, `npm run build` pass for this scope
- `bash ./scripts/harness-check` passes

## Validation Commands

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

If relevant:

```bash
bash ./scripts/architecture-check
bash ./scripts/docs-check
bash ./scripts/tasks-check
bash ./scripts/plans-check
```

Project-specific:

```bash
npm run test -- --testPathPattern="idempotency|audit|side-effect"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Idempotency and side-effect infrastructure underpins all CRM and customer messaging.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- None specific to this task

If none: None.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-76](https://linear.app/sellgenius-dev/issue/SEL-76/task-02-cross-cutting-idempotency-audit-events-side-effect-records)  
Linear status: Done

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (side-effect idempotency, 2026-06-17)  
Depends on: task-01  
Blocks: task-04, task-05, task-06, task-07, task-08

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-76)
2026-06-17 - Implemented - IdempotencyService, AuditService, SideEffectService, Supabase repos, guard, tests
2026-06-19 - Status - Header aligned to Done (Cleanup Fala 1)

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required:
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode:
```
