# Task: Bitrix Write, Telegram, n8n Webhook API

Status: Ready  
Stage: Integration | API  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-83](https://linear.app/sellgenius-dev/issue/SEL-83)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Completion and escalation must update Bitrix (**Deale do dodania** / **Do ręcznej weryfikacji**), add comments, and notify operators on Telegram; n8n must invoke NestJS securely.
- Technical: Execute pending side effects from task-02; wire **one webhook → one use case** (no new monolithic orchestrators). V1 n8n endpoints remain event triggers, not workflow-wide agent loop (OD-008).
- Current behavior: COMPLETION_PENDING / ESCALATION_PENDING states without external execution.
- Target behavior: Bitrix write + Telegram + three n8n webhook endpoints with WebhookAuthGuard.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (side_effect_records, postsale_workflows terminal states)

Integrations:

- Bitrix24 write (stage update, comment)
- Telegram Bot API
- n8n HTTP webhooks (inbound)

Testing/runtime validation tools:

- Jest + Supertest for webhook endpoints
- Mocked BitrixProvider and TelegramProvider

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-07 sets pending states before this task executes side effects
- SideEffectService from task-02 required for all external calls

Technology OPEN_DECISIONs:

- OD-004 Bitrix field/stage IDs
- OD-005 Telegram chat ID
- OD-007 n8n webhook auth mechanism

## Goal

Expected result:

- BitrixProvider write: updateStage, addComment
- TelegramProvider: sendNotification
- ExecuteSideEffectsUseCase for completion and escalation paths
- API controllers: `POST /webhooks/n8n/workflow-start` → `StartWorkflowUseCase` (thin orchestrator from task-12), `email-inbound` → `IngestReplyUseCase`, `follow-up-check` → `SendFollowupUseCase` / policy use case
- WebhookAuthGuard (OD-007)
- Terminal states COMPLETED / ESCALATED after successful Bitrix side effects
- Webhook responses may include `status` only in V1; full `CapabilityResult` on HTTP deferred to V2 (OD-010)

Complete when:

- Case 9: complete → Bitrix Deale do dodania
- Case 10: Bitrix failure blocks COMPLETED
- Case 13: Telegram failure does not block COMPLETED after Bitrix success
- Webhook auth rejects invalid secret

## Scope

Allowed changes:

- `src/domains/bitrix/` write methods
- `src/domains/telegram/`
- `src/api/controllers/webhooks/`
- `src/api/guards/webhook-auth.guard.ts`
- ExecuteSideEffectsUseCase
- Swagger/OpenAPI or inline docs for n8n contract

Likely files/areas:

- `src/api/controllers/webhooks/n8n-workflow.controller.ts`
- `src/domains/postsale-workflows/use-cases/execute-side-effects.use-case.ts`
- `src/integrations/bitrix/bitrix-write.adapter.ts`
- `src/integrations/telegram/telegram.adapter.ts`

## Forbidden Scope

Do not change:

- CompletionPolicy, FollowupPolicy, EscalationPolicy rules (task-07)
- Langflow flows or parsers (tasks 05–06)

Do not implement:

- New Langflow flows
- n8n workflow JSON files in repo
- Business policy changes
- Public `/capabilities/*` MCP routes (V2 / OD-008)
- Workflow-wide agent loop runtime (V3)

Do not touch:

- Template import or matching modules
- Product spec stage semantics
- **Do not** add requirements/reply/completion logic into `StartWorkflowUseCase` — webhooks delegate to task-specific use cases only

## Business Behavior

Expected:

- side_effect_record before each Bitrix/Telegram call
- COMPLETED only after Bitrix completion side effect succeeds
- Telegram failure non-blocking on completion path (case 13)
- Bitrix stages: **Deale do dodania** (complete), **Do ręcznej weryfikacji** (escalate)

Forbidden:

- Bitrix update without COMPLETION_POLICY_PASSED / escalation pending gate
- Duplicate Bitrix completion side effect
- n8n updating Bitrix directly

Edge cases:

- Bitrix retry on temporary failure; COMPLETED blocked until success (case 10)
- Invalid webhook secret → 401, no workflow mutation

## Technical Requirements

Implementation:

- Wire StartWorkflow, IngestReply, FollowupCheck to controllers
- Store Bitrix/Telegram provider response on side_effect_records
- Document n8n request/response contract

Architecture:

- Controller → DTO parser → Command → UseCase
- Bitrix/Telegram via provider interfaces only

Model separation:

- DTO: n8n webhook request bodies (untrusted)
- Command: existing Commands from tasks 04–07
- Domain: unchanged aggregates
- Persistence: side_effect_records status updates
- Integration Payload: Bitrix/Telegram API responses
- LLM Output: none

Boundary parsing:

- input source: n8n webhook HTTP bodies
- parser/schema/mapper: webhook DTO parsers in `src/api/parsers/`
- trusted output type: StartWorkflowCommand, IngestReplyCommand, FollowupCheckCommand
- failure mode: 400 malformed; 401 unauthorized
- forbidden side effects before parse: no use-case run on unvalidated webhook body

Providers:

- auth: WebhookAuthGuard (shared secret)
- CRM/connectors: BitrixProvider (read+write)
- telemetry: provider_result_id, bitrix response storage
- feature flags: none
- LLM: none
- messaging: EmailProvider (follow-up orchestration), TelegramProvider
- payments: none

## State Changes

Allowed:

- Bitrix stage and comment side effects
- Telegram notification side effects
- workflow → COMPLETED | ESCALATED after successful gated side effects
- side_effect_records final status

Forbidden:

- Bypassing COMPLETION_PENDING / ESCALATION_PENDING gates
- COMPLETED when Bitrix completion side effect failed

Side effects:

- UPDATE_BITRIX_STAGE_TO_COMPLETED, UPDATE_BITRIX_STAGE_TO_ESCALATED
- CREATE_BITRIX_COMMENT, SEND_TELEGRAM_NOTIFICATION
- SEND_FOLLOWUP_EMAIL when orchestrated from follow-up endpoint

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- integration: webhook auth rejects bad secret
- integration: completion path updates Bitrix (case 9, mocked)
- unit: Bitrix failure blocks COMPLETED (case 10)
- unit: Telegram failure allows COMPLETED after Bitrix OK (case 13)
- regression: side_effect_record required before Bitrix call
- forbidden behavior: no Bitrix write without pending gate
- edge case: idempotent Bitrix completion side effect

Test format:

```text
Given: Bitrix adapter returns error on stage update
When: ExecuteSideEffectsUseCase runs completion path
Then: workflow not COMPLETED, side_effect_record failed, retry_allowed true
Forbidden side effect: duplicate Bitrix stage update without idempotency
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: Supertest webhook calls return expected status codes
- no-console-error: not required
- sandbox/mock integration: Bitrix and Telegram mocks
- structured log/audit event: BITRIX_STAGE_UPDATE_SUCCEEDED, WORKFLOW_COMPLETED, WORKFLOW_ESCALATED
- trace/request/workflow ID: workflow_id, side_effect_record_id
- idempotency: duplicate side effect prevented

If NO, reason: N/A

## Acceptance Criteria

- All three n8n webhook endpoints functional with auth
- Bitrix completion/escalation stage IDs from env config (OD-004)
- Tests 9, 10, 13 pass
- n8n contract documented (Swagger or design doc addendum)
- End-to-end happy path callable via HTTP sequence
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
npm run test -- --testPathPattern="webhook|bitrix|telegram|side-effect"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: CRM writes, secured webhooks, operator notifications.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-004 Bitrix field/stage IDs
- OD-005 Telegram chat ID
- OD-007 webhook auth header name

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-83](https://linear.app/sellgenius-dev/issue/SEL-83/task-08-bitrix-write-telegram-n8n-webhook-api)  
Linear status: Backlog

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (Bitrix stages, Telegram non-blocking, side effects, 2026-06-17)  
Depends on: task-02, task-04, task-05, task-06, task-07  
Blocks: task-09

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-83)
2026-06-19 - Updated - One webhook → one use case; no capability MCP in V1 (OD-008)

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
