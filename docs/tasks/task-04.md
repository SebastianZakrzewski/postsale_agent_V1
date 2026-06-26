# Task: Workflow Start — Bitrix Context Load, Template Match, Escalation Paths

Status: Done  
Stage: Use Case | Integration | API  
Mode: Review  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-80](https://linear.app/sellgenius-dev/issue/SEL-80)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Post-sale workflow begins when Bitrix deal hits **Oczekiwanie na Zdjęcia**; system must load context, match template, or escalate safely.
- Technical: Orchestrates idempotency (task-02), template matching (task-03), and Bitrix read adapter.
- Current behavior: No workflow start use case or Bitrix integration.
- Target behavior: StartWorkflowUseCase orchestrates idempotency → workflow create → Bitrix read → template match → audit events; EscalateWorkflowUseCase records reason (Bitrix write in task-08).

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (postsale_workflows, idempotency_keys, workflow_events)

Integrations:

- Bitrix24 read API (mock adapter + real adapter)

Testing/runtime validation tools:

- Jest with mocked BitrixProvider

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-02 idempotency/audit services available
- task-03 MatchTemplateUseCase available

Technology OPEN_DECISIONs:

- OD-004 Bitrix custom field mapping for vehicle data

## Goal

Expected result:

- BitrixProvider interface + read adapter (crm.deal.get)
- DealContext parser from Integration Payload (OD-004 field map as config)
- StartWorkflowUseCase with idempotency from task-02
- EscalateWorkflowUseCase (sets escalation reason; no Bitrix write yet)
- Workflow status: STARTED → CONTEXT_LOADED → TEMPLATE_MATCHED or escalation pending

Complete when:

- Duplicate trigger does not create second workflow (baseline case 1)
- NOT_FOUND and AMBIGUOUS invoke escalation path (cases 2, 3)
- Insufficient vehicle data escalates

## Scope

Allowed changes:

- `src/domains/postsale-workflows/use-cases/start-workflow.use-case.ts`
- `src/domains/postsale-workflows/use-cases/escalate-workflow.use-case.ts`
- `src/domains/bitrix/` read adapter and provider interface
- `src/domains/bitrix/parsers/bitrix-deal.parser.ts`
- postsale_workflows repository implementation
- Bitrix field mapping config (OD-004 placeholders)

Likely files/areas:

- `src/integrations/bitrix/bitrix-read.adapter.ts`
- `src/domains/postsale-workflows/repository/postsale-workflow.repository.ts`

## Forbidden Scope

Do not change:

- Template matching rules (task-03)
- Completion or escalation policies (task-07)
- Product spec Bitrix stage names

Do not implement:

- Langflow, email send, Bitrix stage write (task-08)
- Requirements creation (task-05)
- n8n webhook controller (task-08)

Do not touch:

- side-effect execution for Bitrix write
- Customer messaging

## Business Behavior

Expected:

- Idempotent start per bitrix_deal_id + trigger type
- template_match_status: MATCHED | NOT_FOUND | AMBIGUOUS
- Audit events: WORKFLOW_STARTED, DEAL_CONTEXT_LOADED, TEMPLATE_MATCH_SUCCEEDED or escalation event

Forbidden:

- Creating second workflow for duplicate trigger
- Guessing vehicle fields when Bitrix data incomplete
- Bitrix stage update in this task

Edge cases:

- Bitrix deal missing required vehicle fields → escalation
- Bitrix API temporary failure → retry per reliability policy (no business guess)

## Technical Requirements

Implementation:

- StartWorkflowUseCase wires idempotency, Bitrix read, template match, audit
- EscalateWorkflowUseCase sets escalation reason and workflow status only

Architecture:

- Controller → UseCase → Service/Policy → Repository/Integration (controller deferred to task-08)
- Use-case uses BitrixProvider interface, not SDK directly

Model separation:

- DTO: BitrixDealPayload (integration, untrusted)
- Command: `StartWorkflowCommand`, `EscalateWorkflowCommand`
- Domain: `DealContext`, `Workflow`, `TemplateMatchStatus`
- Persistence: postsale_workflows row mapper
- Integration Payload: raw Bitrix REST response
- LLM Output: none

Boundary parsing:

- input source: Bitrix REST deal payload
- parser/schema/mapper: `domains/bitrix/parsers/bitrix-deal.parser.ts` → DealContext
- trusted output type: DealContext value object
- failure mode: escalation if insufficient data; no template match guess
- forbidden side effects before parse: no workflow persistence from raw Bitrix JSON

Providers:

- auth: none in this task (webhook auth in task-08)
- CRM/connectors: BitrixProvider (read only)
- telemetry: workflow_id, request_id in logs
- feature flags: none
- LLM: none
- messaging: none
- payments: none

## State Changes

Allowed:

- postsale_workflows insert/update
- workflow_events via AuditService
- idempotency_keys via IdempotencyService

Forbidden:

- Bitrix stage update
- Customer email
- workflow_requirements creation

Side effects:

- None external (Bitrix read is not a risky write side effect per product spec)

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: DealContext parser rejects missing required vehicle fields
- unit: duplicate idempotency prevents second workflow (case 1)
- integration: StartWorkflowUseCase with mocked Bitrix + template match
- regression: task-02 idempotency tests still pass
- forbidden behavior: no second workflow on duplicate trigger
- edge case: NOT_FOUND and AMBIGUOUS escalation paths (cases 2, 3)

Test format:

```text
Given: same bitrix_deal_id trigger delivered twice
When: StartWorkflowUseCase runs twice
Then: only one postsale_workflows row exists
Forbidden side effect: second workflow creation
```

## Runtime Validation

Runtime Validation: NO

If YES, evidence required: N/A

If NO, reason:

- Bitrix read uses mocks in this task; sandbox/runtime evidence for workflow start in task-09.

## Acceptance Criteria

- StartWorkflowUseCase end-to-end with mocked Bitrix + template match from task-03
- Escalation path records reason and workflow status (pre-Bitrix-write)
- Audit events emitted for start, context load, match or escalation
- Tests for baseline cases 1, 2, 3 pass
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
npm run test -- --testPathPattern="start-workflow|bitrix"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Workflow lifecycle start and CRM read integration.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-004 Bitrix field mapping — config-driven placeholders until Human Architect confirms

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-80](https://linear.app/sellgenius-dev/issue/SEL-80/task-04-workflow-start-bitrix-read-template-match-escalation)  
Linear status: Done (Human Architect merge 2026-06-19)

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: https://github.com/SebastianZakrzewski/postsale_agent_V1/commit/b3c13d3  
Related reviews: Review 2026-06-19 APPROVED_FOR_CODEX_AUDIT; Codex Audit 2026-06-19 APPROVED_FOR_HUMAN_REVIEW  
Related QA evidence: Mocked integration tests (start-workflow, bitrix, webhooks); full runtime validation deferred to task-09 per task scope  
Related decisions: `docs/decision-log.md` (Bitrix stages, template matching, 2026-06-17)  
Depends on: task-01, task-02, task-03  
Blocks: task-12 (capability foundation refactor; then task-05)

## Post-merge follow-up (task-12)

Implementation delivered a **monolithic** `StartWorkflowUseCase` acceptable for V1 review. Before task-05, **task-12** must:

- persist `DealContext` and `car_template_id` on `postsale_workflows`
- extract `LoadDealContextUseCase` and `MatchWorkflowTemplateUseCase`
- thin the start orchestrator without changing n8n-visible behavior

See `docs/design-docs/postsale-agent-capabilities-agent-loop.md` and TD-ARCH-005.

Known gaps in current implementation (addressed by task-12, not re-open task-04 acceptance):

- `deal_context_json` not persisted — context exists only in logs
- `car_template_id` not on workflow row — only in audit payload
- Bitrix payload referenced after parse (TD-ARCH-002)

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-80)
2026-06-19 - Implemented - StartWorkflowUseCase, Bitrix read adapter, webhooks controller, unit/integration tests (73-test suite green)
2026-06-19 - Status - In Review pending Codex Audit and runtime evidence closure (Cleanup Fala 1)
2026-06-19 - Review - APPROVED_FOR_CODEX_AUDIT; checks green; scope/doc notes in review report
2026-06-19 - Updated - Post-merge follow-up linked to task-12 (capability / agent-loop path)
2026-06-19 - Codex Audit - APPROVED_FOR_HUMAN_REVIEW; scope/boundary/architecture PASS with documented debt (TD-ARCH-001/002/003, TD-SEC-002); no required fixes; next Human Architect approval/merge
2026-06-19 - Done - Human Architect approved merge; 73/73 tests, lint, build PASS

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
