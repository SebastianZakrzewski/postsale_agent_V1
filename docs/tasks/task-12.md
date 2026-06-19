# Task: Workflow Capability Foundation — Schema, Start Decomposition, CapabilityResult

Status: Done  
Stage: Domain | Persistence | Use Case  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: Medium  
Created: 2026-06-19  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-85](https://linear.app/sellgenius-dev/issue/SEL-85)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/design-docs/postsale-agent-langflow-tools.md`, `docs/decision-log.md`, `docs/open-decisions.md` (OD-008, OD-009, OD-010).  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Future agent-loop orchestration requires each workflow step to be invokable independently with readable persisted state; V1 n8n start path must remain unchanged.
- Technical: task-04 implemented `StartWorkflowUseCase` as a monolith; `DealContext` and matched `car_template_id` are not persisted on `postsale_workflows`; downstream tasks (05+) need stable workflow-scoped data without re-reading Bitrix or extending the start monolith.
- Current behavior: Start loads context and matches template inline; only `status` and `template_match_status` persist; match logic updates workflow from inside start.
- Target behavior: Persist deal context snapshot + `car_template_id`; extract `LoadDealContextUseCase` and `MatchWorkflowTemplateUseCase`; `StartWorkflowUseCase` becomes a thin orchestrator with **identical external behavior** for n8n; introduce internal `CapabilityResult` type for use-case responses (OD-010 draft).

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase migration on `postsale_workflows` (new columns)

Integrations:

- Bitrix read (existing BitrixProvider; used inside `LoadDealContextUseCase` only)

Testing/runtime validation tools:

- Jest; existing task-04 start-workflow tests must pass unchanged (behavior-preserving refactor)

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-04 merged / Done before this task starts
- task-03 `MatchTemplateUseCase` unchanged (matching rules)

Technology OPEN_DECISIONs:

- OD-009 decomposition timeline — this task implements recommended default
- OD-010 full external API contract — internal `CapabilityResult` only in this task; HTTP/MCP deferred

## Goal

Expected result:

- Supabase migration adds `deal_context_json JSONB`, `car_template_id UUID REFERENCES car_templates(id)`, optional denormalized `product TEXT` if needed for note selection
- `LoadDealContextUseCase`: Bitrix read → parse → persist `deal_context_json` → `CONTEXT_LOADED` → audit
- `MatchWorkflowTemplateUseCase`: read persisted context → `MatchTemplateUseCase` → persist `car_template_id` + status → audit
- `StartWorkflowUseCase` refactored to: idempotency + create → `LoadDealContextUseCase` → `MatchWorkflowTemplateUseCase` (+ escalate/fail paths unchanged)
- `CapabilityResult` domain type in `src/lib/domain/` with: `workflowId`, `status`, `done`, `softStop`, `allowedNextActions[]` (draft list from design doc guard matrix)
- `GetWorkflowContextUseCase` (read-only): returns workflow + parsed `DealContext` + template id for Langflow read tools prep
- TD-ARCH-002 fixed: no use of raw Bitrix payload after `parseBitrixDeal`

Complete when:

- All existing task-04 start-workflow tests pass without behavior change
- After successful start, `deal_context_json` and `car_template_id` populated on matched workflows
- `StartWorkflowUseCase` contains no inline Bitrix parse/match status-update blocks (delegated to extracted use cases)
- New unit tests for `LoadDealContextUseCase` and `MatchWorkflowTemplateUseCase`

## Scope

Allowed changes:

- `supabase/migrations/` new migration for `postsale_workflows` columns
- `src/lib/domain/capability-result.domain.ts` (or equivalent)
- `src/lib/domain/workflow.domain.ts`, persistence rows/mappers
- `src/domains/postsale-workflows/use-cases/load-deal-context.use-case.ts`
- `src/domains/postsale-workflows/use-cases/match-workflow-template.use-case.ts`
- `src/domains/postsale-workflows/use-cases/get-workflow-context.use-case.ts`
- Refactor `start-workflow.use-case.ts` to thin orchestrator
- `postsale-workflow.repository.ts` + Supabase implementation (new update methods)
- Tests under `src/tests/`

Likely files/areas:

- `src/integrations/supabase/supabase-postsale-workflow.repository.ts`
- `src/domains/postsale-workflows/postsale-workflows.module.ts`

## Forbidden Scope

Do not change:

- Template matching rules (task-03)
- n8n webhook contract response shape for `start_workflow` (task-08 may extend later)
- Business escalation/completion policies

Do not implement:

- Public HTTP/MCP capability routes (V2 / OD-008)
- `WorkflowStateGuard` HTTP 422 responses (V2; draft `allowedNextActions` in `CapabilityResult` only)
- Requirements, email, Langflow flows (task-05)
- Multi-agent loop runtime (V3)

Do not touch:

- Product spec Bitrix stage names
- Langflow forbidden direct tools

## Business Behavior

Expected:

- n8n duplicate start behavior unchanged (idempotency cases 1–3)
- Matched workflow has persisted vehicle/product context for task-05 note selection
- Escalation/fail paths unchanged from task-04 acceptance

Forbidden:

- Behavior change visible to n8n start webhook
- Second workflow on duplicate trigger
- Guessing vehicle fields when Bitrix data incomplete

Edge cases:

- Load context retry on same workflow: idempotency scope `workflow_id + load_context` (safe re-run updates snapshot or no-op if already CONTEXT_LOADED+)
- Match retry when already TEMPLATE_MATCHED: no-op or idempotent return per OD-009

## Technical Requirements

Implementation:

- Each extracted use case returns `CapabilityResult` (or wraps workflow + capability metadata)
- `LoadDealContextUseCase` idempotency scope: `load_deal_context` per workflow
- `MatchWorkflowTemplateUseCase` idempotency scope: `match_workflow_template` per workflow
- Repository methods: `updateDealContext`, `updateCarTemplateId` (or single patch method)

Architecture:

- Controller → UseCase unchanged (no new controllers in this task)
- `MatchWorkflowTemplateUseCase` wraps `MatchTemplateUseCase`; does not duplicate matching logic
- Parse boundary: Bitrix payload used only inside `LoadDealContextUseCase` until `DealContext` persisted

Model separation:

- DTO: none new external
- Command: `LoadDealContextCommand`, `MatchWorkflowTemplateCommand`, `GetWorkflowContextQuery`
- Domain: `DealContext`, `Workflow` (extended), `CapabilityResult`
- Persistence: `deal_context_json`, `car_template_id` on `PostsaleWorkflowRow`
- Integration Payload: Bitrix (inside load use case only)
- LLM Output: none

Boundary parsing:

- input source: Bitrix REST (load use case)
- parser: existing `bitrix-deal.parser.ts`
- trusted output: `DealContext` persisted as JSONB
- failure mode: escalate/fail via existing use cases from start orchestrator

Providers:

- CRM/connectors: BitrixProvider read only
- telemetry: workflow_id, request_id on load/match

## State Changes

Allowed:

- `postsale_workflows.deal_context_json`, `car_template_id`, `product` updates
- Existing status transitions STARTED → CONTEXT_LOADED → TEMPLATE_MATCHED (or escalate/fail)
- workflow_events unchanged event types

Forbidden:

- New terminal states
- workflow_requirements creation
- External side effects

Side effects:

- Bitrix read only (non-write)

## Testing

Required tests:

- unit: `LoadDealContextUseCase` persists JSONB and sets CONTEXT_LOADED
- unit: `MatchWorkflowTemplateUseCase` sets car_template_id on MATCHED
- integration: refactored `StartWorkflowUseCase` — all prior tests green
- regression: duplicate idempotency (case 1), NOT_FOUND/AMBIGUOUS (cases 2, 3)
- forbidden behavior: start orchestrator does not call Bitrix parse inline after refactor

Test format:

```text
Given: workflow STARTED, Bitrix returns valid deal
When: LoadDealContextUseCase runs
Then: deal_context_json populated, status CONTEXT_LOADED
Forbidden side effect: template match without persisted context in downstream tasks
```

## Runtime Validation

Runtime Validation: NO

If NO, reason:

- Refactor with mocked Bitrix; sandbox evidence remains in task-09.

## Acceptance Criteria

- Migration applied; columns on `postsale_workflows`
- task-04 test suite passes (behavior-preserving)
- `StartWorkflowUseCase` ≤ orchestration calls (no inline parse/match blocks)
- `GetWorkflowContextUseCase` returns persisted DealContext for matched workflow
- `CapabilityResult` type used by load/match use cases
- TD-ARCH-002 resolved in start/load path
- `bash ./scripts/harness-check` passes

## Validation Commands

```bash
bash ./scripts/harness-check
npm run test -- --testPathPattern="start-workflow|load-deal|match-workflow|workflow-context"
npm run lint
npm run build
```

## Codex Review Contract

Codex Audit required: YES  
Reason: Persistence schema change and workflow lifecycle refactor — behavior must remain identical for production trigger.

## OPEN_DECISIONs

Blocking:

- None (implements OD-009 recommended default)

Non-blocking:

- OD-008 agent runtime location — no external API in this task
- OD-010 exact external response JSON — internal CapabilityResult only

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-85](https://linear.app/sellgenius-dev/issue/SEL-85/task-12-workflow-capability-foundation-schema-start-decomposition)  
Linear status: In Review (implementation complete; Codex Audit pending)

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related design: `docs/design-docs/postsale-agent-capabilities-agent-loop.md`  
Related tech debt: TD-ARCH-005, TD-ARCH-002  
Depends on: task-04 (Done)  
Blocks: task-05

## History

2026-06-19 - Created - Docs update for agent-loop capability path (Human Architect direction)
2026-06-19 - Updated - Linear issue linked (SEL-85); blocks SEL-79
2026-06-19 - Implemented - Capability foundation; 83/83 tests PASS; awaiting Codex Audit
2026-06-19 - Merged - Human merge to master; 84/84 tests PASS; review fixes included

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
