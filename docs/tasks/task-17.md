# Task: Post-Completion UX and Reply-Path Enhancements

Status: Draft  
Stage: Domain | Integration | API  
Mode: Implementation  
Owner: Human Architect  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-26  
Last updated: 2026-06-26

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Deferred from: task-16 scope split (2026-06-26)  
PR: TBD  
Depends on: task-07, task-08, task-16

## Context

Why this task exists:

- Business: Improve customer experience after incomplete replies and after successful completion without weakening completion safety policies.
- Technical: Prototype work existed in local WIP but was split out of task-16 to keep that PR within declared scope.
- Target behavior:
  - Immediate follow-up after incomplete customer reply (`ACTIVE_REPLY` trigger) with product-spec amendment
  - Completion confirmation email after Bitrix completion path
  - Upload accepted PHOTO evidence to Bitrix deal floor-photos field
  - Rich Bitrix completion comments and Telegram notifications (optional)

## Scope

Allowed changes (when approved):

- `followup.policy.ts` — `ACTIVE_REPLY` vs `SILENCE` triggers; product spec + process map updates
- `webhooks.controller.ts` — orchestrate analyze → try-complete → active follow-up on inbound email
- `SendCompletionConfirmationEmailUseCase` + side effect enum/migration
- `UploadDealFloorPhotosUseCase` + attachment `content_base64` persistence migration
- `TryCompleteWorkflowUseCase` for webhook completion orchestration
- `execute-pending-side-effects` enrichment (rich comments, optional stage-update flag)
- `.env.example` — `BITRIX_COMPLETION_STAGE_UPDATE_ENABLED`, `floorPhotos` field mapping

## Forbidden Scope

- Weakening completion/follow-up policy safety (VALID without evidence, COMPLETE with incomplete requirements)
- Merging without Human Architect approval of follow-up policy product-spec change

## Migrations (planned)

Apply before production deploy:

1. `20260626180000_send_completion_confirmation_email_side_effect.sql`
2. `20260626181000_completion_confirmation_email_sent_event.sql`
3. `20260626190000_message_attachment_content_base64.sql`
4. `20260626191000_upload_bitrix_deal_photos_side_effect.sql`

Note: `20260626140000_task16_customer_question.sql` belongs to task-16, not this task.

## OPEN_DECISIONs

Blocking:

- Human Architect approval for immediate follow-up policy (product spec change)

Non-blocking:

- Production Langflow deploy of follow-up spec changes (OD-003)

## History

2026-06-26 - Created - Docs Maintenance: deferred from task-16 scope split after repo review
