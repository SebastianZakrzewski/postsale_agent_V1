# Task: Startup Orchestration, Completion Email, Floor Photos, ACTIVE_REPLY Follow-Up

Status: In Review  
Stage: Domain | Use Case | Integration | Persistence | API  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-26  
Last updated: 2026-06-26

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Branch: `feat/task-16-agent-effectiveness`  
Commits: `f88db20` (task-16 scoped base), `ffa1c1f` (full WIP restore)  
PR: https://github.com/SebastianZakrzewski/postsale_agent_V1/pull/new/feat/task-16-agent-effectiveness  
Depends on: task-07 (follow-up policies), task-08 (side effects), task-16 (effectiveness payloads)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/decision-log.md`, `docs/open-decisions.md`, `docs/tasks/task-16.md`.

## Context

Why this task exists:

- Business: n8n triggers only `POST /webhooks/workflow/start`; without in-process continuation the workflow stalls at `TEMPLATE_MATCH_SUCCEEDED`. Customers need immediate follow-up after partial replies (multi-mail Q&A). Completion should send confirmation email and attach accepted floor photos to Bitrix.
- Technical: `CreateRequirementsUseCase` and `SendInitialEmailUseCase` were standalone; `TryCompleteWorkflowUseCase` and completion confirmation were missing from webhook orchestration; PHOTO evidence needs `content_base64` for Bitrix upload; follow-up policy needed `ACTIVE_REPLY` vs `SILENCE` triggers.
- Current behavior (pre-task-17): Start stops after template match; timer-only follow-ups; no completion confirmation email; no Bitrix floor photo upload.
- Target behavior: Auto-continue startup pipeline; dual follow-up triggers; try-complete on inbound; rich Bitrix completion comment; confirmation email side effect; floor photo upload side effect.

## Technology Context

Application type: backend  
Framework/runtime: NestJS on Node.js  
Language: TypeScript  
Persistence: Supabase — side effect enums, `message_attachments.content_base64`, completion/floor-photo event types  
Integrations: Bitrix (deal file fields, completion comment), n8n email (confirmation), Telegram (workflow notifications), inbound email base64 attachments  
Testing: Jest unit + integration (`227` tests with task-16)

## Goal

Expected result:

- `StartWorkflowUseCase.continueStartupPipeline()` chains requirements + initial email after `TEMPLATE_MATCHED` / resume from `REQUIREMENTS_CREATED`.
- `webhooks.controller` orchestrates `TryCompleteWorkflowUseCase` after analyze and `SendFollowupUseCase` with `ACTIVE_REPLY` after incomplete inbound.
- `FollowupPolicy` supports `ACTIVE_REPLY` (immediate, no timer count) and `SILENCE` (24h / 48h / 60h timer chain, max 3).
- `TryCompleteWorkflowUseCase` evaluates completion policy and enqueues Bitrix/Telegram/confirmation-email side effects.
- `UploadDealFloorPhotosUseCase` uploads accepted PHOTO attachments to Bitrix deal file field.
- `SendCompletionConfirmationEmailUseCase` sends customer confirmation on COMPLETE.
- Migrations for side effects, events, `content_base64`, upload enum.

Complete when:

- All acceptance criteria pass
- `npm test` and `harness-check` PASS
- Migrations applied to target Supabase before deploy
- Human Architect accepts scope split vs task-16 (this file is source of truth for task-17 code)

## Scope

Allowed changes:

- `StartWorkflowUseCase` — `continueStartupPipeline`, resume paths for duplicate start
- `webhooks.controller.ts` — TryComplete + ACTIVE_REPLY follow-up orchestration
- `TryCompleteWorkflowUseCase`, `SendCompletionConfirmationEmailUseCase`, `UploadDealFloorPhotosUseCase`
- `execute-pending-side-effects.use-case.ts` — completion comment, confirmation email, Telegram, floor photos
- `followup.policy.ts`, `send-followup.use-case.ts`, `process-followup-check.use-case.ts`
- `analyze-reply.use-case.ts` — floor photo upload hook
- Bitrix: `bitrix-write.adapter.ts` upload, file field builders, `accepted-photo-attachment-refs`, portal config
- Email: `completion-confirmation-email.builder.ts`, `customer-reply-excerpt.ts`, inbound `content_base64` chain
- Telegram: `telegram-workflow-notification.builder.ts`
- `workflow.commands.ts`, side-effect and workflow-event enums
- `main.ts` — 10mb JSON body limit for inbound attachments
- `.env.example` — `BITRIX_COMPLETION_STAGE_UPDATE_ENABLED`, floor photo field mapping
- Migrations `20260626180000` … `20260626191000`
- Unit/integration tests for all above

Likely files/areas:

- `src/domains/postsale-workflows/use-cases/start-workflow.use-case.ts`
- `src/domains/postsale-workflows/use-cases/try-complete-workflow.use-case.ts`
- `src/api/controllers/webhooks.controller.ts`
- `src/domains/bitrix/use-cases/upload-deal-floor-photos.use-case.ts`
- `src/domains/email/use-cases/send-completion-confirmation-email.use-case.ts`
- `supabase/migrations/2026062618*.sql`, `2026062619*.sql`

## Forbidden Scope

- Changing completion policy PASS/INCOMPLETE/DENY rules (only orchestration and triggers)
- PHOTO VALID without attachment evidence
- Direct Supabase PROD data fixes
- n8n workflow JSON changes in this repo (runtime wiring is ops)
- Removing or deferring task-17 behaviors during Review without Human Architect approval

## Business Behavior

Expected:

- After Bitrix deal trigger, customer receives initial email without manual follow-up API calls.
- Customer may answer requirements across multiple emails; each incomplete inbound gets immediate follow-up (`ACTIVE_REPLY`).
- Timer follow-ups fire only on silence via n8n `follow-up-check`.
- On COMPLETE: Bitrix deal updated, rich completion comment, optional stage move, confirmation email, accepted floor photos on deal.

Forbidden:

- COMPLETE with incomplete requirements
- Customer email on AMBIGUOUS / NOT_FOUND template match (task-16 gate unchanged)

## Technical Requirements

Implementation:

- `continueStartupPipeline`: `CreateRequirementsUseCase` → `SendInitialEmailUseCase` when status allows
- `TryCompleteWorkflowUseCase`: completion policy → side effect records → `ExecutePendingSideEffectsUseCase`
- `FollowupPolicyTrigger`: `ACTIVE_REPLY` | `SILENCE` with separate idempotency keys
- Persist `content_base64` on ingest for Bitrix upload path
- `BITRIX_COMPLETION_STAGE_UPDATE_ENABLED` gates stage transition on completion

Architecture:

- Controller orchestrates use cases; policies remain pure
- Side effects via existing record-before-execute pattern (task-02)

## State Changes

Allowed:

- New side effect types: `SEND_COMPLETION_CONFIRMATION_EMAIL`, `UPLOAD_BITRIX_DEAL_PHOTOS`
- New workflow events: `COMPLETION_CONFIRMATION_EMAIL_SENT`
- `message_attachments.content_base64` nullable TEXT

Forbidden:

- Workflow terminal status changes outside completion policy

Side effects:

- Bitrix deal file upload, completion comment, optional stage update
- Customer confirmation email
- Telegram workflow notifications (non-blocking per task-08)

## Testing

Required tests:

- unit: followup ACTIVE_REPLY/SILENCE; try-complete; completion email builder; floor photo upload; accepted-photo refs; webhooks orchestration
- integration: `webhooks.controller.spec.ts`, `execute-pending-side-effects`
- policies: baseline-policy follow-up extensions

Validation:

```bash
bash ./scripts/harness-check
npm test
```

## Runtime Validation

Runtime Validation: NO (E2E scripts under `scripts/run-e2e-*.ts` optional; not part of harness)

## Acceptance Criteria

- [x] `continueStartupPipeline` unblocks n8n-only start webhook through initial email
- [x] ACTIVE_REPLY follow-up after incomplete inbound; SILENCE timers unchanged for n8n check
- [x] TryComplete + completion confirmation email + floor photo upload wired
- [x] Migrations `20260626180000`–`20260626191000` in repo
- [x] `227` tests PASS; harness-check PASS

## Validation Commands

```bash
bash ./scripts/harness-check
npm test
npm run build
```

## Codex Review Contract

Codex must review: customer messaging on completion, Bitrix file upload, ACTIVE_REPLY follow-up vs completion safety, side-effect idempotency, attachment base64 handling, and no completion-policy regression.

Codex Audit required: YES  
Reason: customer emails, Bitrix writes, CRM file upload, follow-up trigger change

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- Apply migrations to PROD Supabase before deploy
- n8n body size / attachment forwarding for large photos

## Linear Mapping

Linear project: Postsale Agent Evapremium V1  
Linear issue: TBD  
Linear status: Backlog

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: `feat/task-16-agent-effectiveness` (task-16 + task-17 on same branch)  
Related tasks: task-07, task-08, task-16

## History

2026-06-26 - Created - Human Architect: document task-17 scope split from task-16 after review revert  
2026-06-26 - In Review - Implementation: commits `f88db20`, `ffa1c1f`; 227 tests PASS

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required: YES
Next recommended mode: Review (read-only) → Codex Audit → merge → apply migrations
```

## Review Protection

Agents in **Review Mode** must not delete, defer, or split this scope without Human Architect approval. Findings go to report only; implementation fixes require an explicit allowed file list.
