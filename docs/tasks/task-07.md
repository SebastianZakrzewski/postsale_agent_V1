# Task: Completion Policy, Follow-Up, Escalation Policies

Status: Ready  
Stage: Domain | Use Case  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-82](https://linear.app/sellgenius-dev/issue/SEL-82)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/design-docs/postsale-agent-langflow-tools.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Core safety rules — when workflow may complete, follow up, or escalate — must live in NestJS policies, not Langflow or n8n.
- Technical: Pure/domain policies + **standalone orchestrating use cases**; Langflow `propose_completion` ignored unless CompletionPolicy passes; terminal `CapabilityResult.done` when COMPLETED/ESCALATED pending Bitrix (task-08).
- Current behavior: REQUIREMENTS_UPDATED without policy evaluation.
- Target behavior: CompletionPolicy, FollowupPolicy, EscalationPolicy; ApplyCompletionPolicyUseCase; SendFollowupUseCase (draft via Langflow, send via email module); pending Bitrix/Telegram states without external calls.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (postsale_workflows follow_up_count, workflow status, workflow_events)

Integrations:

- Langflow draft-followup-email (proposal/draft only)
- EmailProvider for follow-up send (via SideEffectService)

Testing/runtime validation tools:

- Jest unit tests on pure policies

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-06 evidence and requirement statuses available
- Follow-up schedule enforced in NestJS (24h, 48h, max 3) — n8n timer calls endpoint in task-08

Technology OPEN_DECISIONs:

- None specific to this task

## Goal

Expected result:

- CompletionPolicy.evaluate(): PASS | INCOMPLETE | ESCALATE per product spec checklist
- FollowupPolicy: 24h, 48h, max 3 attempts
- EscalationPolicy: reasons from product spec
- ApplyCompletionPolicyUseCase, SendFollowupUseCase, EscalateFromPolicyUseCase (or equivalent) — **each standalone**, not one mega use case
- `CapabilityResult`: `done: true` only for terminal or `soft_stop: true` for WAITING_FOR_CUSTOMER_REPLY after follow-up send
- Status: COMPLETION_PENDING_BITRIX_UPDATE or ESCALATION_PENDING_BITRIX_UPDATE (no external calls)

Complete when:

- Case 8: incomplete requirements do not complete
- Case 11: follow-up only when requirements missing
- Case 12: max 3 follow-ups then escalation
- Langflow propose_completion cannot bypass policy

## Scope

Allowed changes:

- `src/domains/postsale-workflows/policies/completion.policy.ts`
- `src/domains/postsale-workflows/policies/followup.policy.ts`
- `src/domains/postsale-workflows/policies/escalation.policy.ts`
- `src/domains/postsale-workflows/use-cases/apply-completion-policy.use-case.ts`
- `src/domains/postsale-workflows/use-cases/send-followup.use-case.ts`

Likely files/areas:

- `src/domains/postsale-workflows/policies/*.policy.spec.ts`
- `src/domains/postsale-workflows/use-cases/send-followup.use-case.ts`

## Forbidden Scope

Do not change:

- Evidence storage rules (task-06)
- Bitrix stage names or side-effect execution (task-08)

Do not implement:

- Bitrix API calls (task-08)
- Telegram send (task-08)
- n8n timer workflows (external)
- n8n webhook controllers (task-08)

Do not touch:

- Template matching or requirements classification logic

## Business Behavior

Expected:

- Completion only when all product spec conditions met (MATCHED template, all required VALID with evidence, no unsafe_notes, etc.)
- Follow-up: 24h, 48h, max 3, then escalate
- COMPLETION_POLICY_PASSED audit event before pending Bitrix update state

Forbidden:

- COMPLETED when any required requirement incomplete (case 8)
- Follow-up when all requirements VALID with evidence (case 11)
- Treating incomplete customer reply as complete
- Langflow propose_completion bypassing CompletionPolicy

Edge cases:

- propose_completion from Langflow while requirements PARTIAL → INCOMPLETE, send follow-up if allowed
- follow_up_count at max → ESCALATE

## Technical Requirements

Implementation:

- Policies as pure functions over Domain workflow + requirements aggregate
- SendFollowupUseCase uses Langflow draft + email module + SideEffectService

Architecture:

- Policies have no I/O; use cases orchestrate
- No external SDK in policies

Model separation:

- DTO: FollowupCheckCommand (internal, from future n8n webhook)
- Command: `ApplyCompletionPolicyCommand`, `SendFollowupCommand`
- Domain: `CompletionPolicyResult`, `FollowupPolicyResult`, `WorkflowAggregate`
- Persistence: workflow status and follow_up_count updates
- Integration Payload: Langflow follow-up draft (untrusted)
- LLM Output: follow-up draft parsed before send

Boundary parsing:

- input source: Domain aggregate built from repositories; Langflow follow-up draft JSON
- parser/schema/mapper: follow-up draft parser in langflow module
- trusted output type: EmailDraft for follow-up
- failure mode: do not send follow-up if policy says INCOMPLETE not eligible
- forbidden side effects before parse: no SEND_FOLLOWUP_EMAIL before draft validated

Providers:

- auth: none in this task
- CRM/connectors: none
- telemetry: COMPLETION_POLICY_PASSED events
- feature flags: none
- LLM: LangflowProvider (draft-followup only)
- messaging: EmailProvider (via use case)
- payments: none

## State Changes

Allowed:

- workflow status updates to COMPLETION_PENDING_BITRIX_UPDATE, ESCALATION_PENDING_BITRIX_UPDATE, WAITING_FOR_CUSTOMER_REPLY (after follow-up)
- follow_up_count increment
- workflow_events (COMPLETION_POLICY_PASSED)
- side_effect SEND_FOLLOWUP_EMAIL when policy allows

Forbidden:

- COMPLETED or ESCALATED terminal without task-08 side effects
- Bitrix or Telegram external calls in this task

Side effects:

- SEND_FOLLOWUP_EMAIL only when FollowupPolicy allows (via SideEffectService)

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: CompletionPolicy all product spec conditions (case 8)
- unit: FollowupPolicy max 3 attempts (case 12)
- unit: follow-up only when INCOMPLETE (case 11)
- integration: propose_completion ignored when policy fails
- regression: VALID-without-evidence still blocked from completion
- forbidden behavior: incomplete → not COMPLETION_PENDING
- edge case: max follow-ups → escalation path

Test format:

```text
Given: one required requirement PENDING
When: CompletionPolicy.evaluate()
Then: INCOMPLETE, not COMPLETION_PENDING_BITRIX_UPDATE
Forbidden side effect: mark COMPLETED
```

## Runtime Validation

Runtime Validation: NO

If YES, evidence required: N/A

If NO, reason:

- Policy unit tests sufficient here; end-to-end runtime validation in task-09.

## Acceptance Criteria

- CompletionPolicy matches product spec checklist exactly
- FollowupPolicy enforces 3-attempt max and timing rules
- SendFollowupUseCase only when INCOMPLETE and follow-up allowed
- propose_completion cannot bypass policy (integration test)
- Tests 8, 11, 12 pass
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
npm run test -- --testPathPattern="completion|followup|escalation|policy"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Core business safety rules including must-never-happen incomplete→complete.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- None

If none: None.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-82](https://linear.app/sellgenius-dev/issue/SEL-82/task-07-completion-follow-up-escalation-policies)  
Linear status: Backlog

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (completion policy, follow-up policy, 2026-06-17)  
Depends on: task-06  
Blocks: task-08

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-82)
2026-06-19 - Updated - Standalone policy use cases; CapabilityResult termination semantics (OD-010 draft)

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
