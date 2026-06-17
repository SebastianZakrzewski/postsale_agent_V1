# Task: Requirements + Langflow Classification + Initial Email

Status: Ready  
Stage: Domain | Use Case | Integration  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-18

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-79](https://linear.app/sellgenius-dev/issue/SEL-79)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-langflow-tools.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: After template match, selected notes must become classified workflow_requirements before any customer email is sent.
- Technical: Langflow classify + draft flows invoked via LangflowProvider; NestJS validates all LLM output; SideEffectService sends initial email.
- Current behavior: Matched workflow without requirements or outbound email.
- Target behavior: Langflow classify → validate → persist requirements → Langflow draft initial email → validate → SEND_INITIAL_EMAIL side effect → WAITING_FOR_CUSTOMER_REPLY.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (workflow_requirements, langflow_runs, outgoing_messages, postsale_workflows)

Integrations:

- Langflow (classify-template-notes, draft-initial-email)
- EmailProvider (outbound send)

Testing/runtime validation tools:

- Jest with mocked LangflowProvider and EmailProvider

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-02 SideEffectService available
- task-04 matched workflow exists

Technology OPEN_DECISIONs:

- OD-003 Langflow hosting URL/auth
- OD-001 email provider (mock in tests)

## Goal

Expected result:

- LangflowProvider + classify and email-draft parsers
- CreateRequirementsUseCase: classify → validate confidence ≥ 0.75 → reject unsafe → persist
- SendInitialEmailUseCase: draft via Langflow → validate → side_effect_record → send
- Workflow status: REQUIREMENTS_CREATED → WAITING_FOR_CUSTOMER_REPLY

Complete when:

- Baseline tests 4, 5, 15 pass
- Initial email blocked until requirements exist (case 5)
- Unsafe notes escalate (case 4)
- Low confidence rejected (case 15)

## Scope

Allowed changes:

- `src/domains/requirements/`
- `src/domains/langflow/` (provider, parsers, flow config)
- `src/domains/email/` outbound send path
- Langflow output schemas for classification and email draft
- langflow_runs audit persistence

Likely files/areas:

- `src/domains/requirements/use-cases/create-requirements.use-case.ts`
- `src/domains/email/use-cases/send-initial-email.use-case.ts`
- `src/domains/langflow/parsers/classify-notes.parser.ts`
- `src/integrations/langflow/langflow.adapter.ts`

## Forbidden Scope

Do not change:

- Template matching rules (task-03)
- Completion or follow-up policies (task-07)

Do not implement:

- Reply ingestion (task-06)
- Completion policy (task-07)
- Bitrix write (task-08)
- n8n webhook controllers (task-08)

Do not touch:

- Langflow forbidden direct tools (must not be added)

## Business Behavior

Expected:

- requirement_label: YES_NO_INFO, OPTION_SELECTION, MEASUREMENT, TEXT_CONFIRMATION, PHOTO_REQUIRED
- classification_reason, source_field, source_note stored on workflow_requirements
- question_text rewrite must not alter source_note meaning
- INITIAL_EMAIL_SENT audit event after successful send

Forbidden:

- Send initial email before workflow_requirements rows exist
- Persist Langflow output below 0.75 confidence
- VALID status on requirements at creation (evidence comes in task-06)
- Raw LLM output written to DB without parser validation

Edge cases:

- Langflow returns unsafe_notes → escalate, no requirements persisted
- Email provider temporary failure → retry via side_effect_record
- Empty classify result → escalate

## Technical Requirements

Implementation:

- CreateRequirementsUseCase and SendInitialEmailUseCase
- Confidence threshold 0.75 enforced in validator
- langflow_runs row for each invocation

Architecture:

- Use-case → LangflowProvider / EmailProvider interfaces
- No Langflow SDK in use-cases

Model separation:

- DTO: Langflow HTTP response shapes (untrusted)
- Command: `CreateRequirementsCommand`, `SendInitialEmailCommand`
- Domain: `Requirement`, `EmailDraft`, `ClassifiedRequirementDraft`
- Persistence: workflow_requirements, langflow_runs, outgoing_messages rows
- Integration Payload: Langflow API JSON
- LLM Output: parsed before Domain mapping

Boundary parsing:

- input source: Langflow classify and draft JSON
- parser/schema/mapper: `classify-notes.parser.ts`, `email-draft.parser.ts`
- trusted output type: Domain Requirement[], EmailDraft
- failure mode: reject send; escalate on unsafe/low confidence
- forbidden side effects before parse: no email send before EmailDraft validated

Providers:

- auth: none added in this task
- CRM/connectors: none
- telemetry: langflow_run_id, workflow_id correlation
- feature flags: none
- LLM: LangflowProvider
- messaging: EmailProvider
- payments: none

## State Changes

Allowed:

- workflow_requirements, langflow_runs, outgoing_messages inserts/updates
- postsale_workflows status → REQUIREMENTS_CREATED, WAITING_FOR_CUSTOMER_REPLY
- side_effect SEND_INITIAL_EMAIL

Forbidden:

- Bitrix stage update
- VALID requirement without evidence
- Reply or completion state transitions

Side effects:

- SEND_INITIAL_EMAIL only (via SideEffectService from task-02)

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: confidence < 0.75 rejected (case 15)
- unit: unsafe notes trigger escalation (case 4)
- integration: requirements before email (case 5)
- integration: langflow_runs and outgoing_messages persisted
- regression: side-effect record required before send
- forbidden behavior: email not sent without requirements
- edge case: question_text rewrite validation preserves source_note meaning

Test format:

```text
Given: workflow TEMPLATE_MATCHED, requirements not yet created
When: SendInitialEmailUseCase invoked directly
Then: rejected / not sent
Forbidden side effect: email send
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: mocked email provider call captured
- no-console-error: not required
- sandbox/mock integration: Langflow and email mocks
- structured log/audit event: INITIAL_EMAIL_SENT, langflow_runs row
- trace/request/workflow ID: workflow_id, langflow_run_id
- idempotency: side_effect_record for SEND_INITIAL_EMAIL

If NO, reason: N/A

## Acceptance Criteria

- Requirements persisted only after Langflow validation passes
- Initial email sent only after requirements exist
- langflow_runs audit for classify and draft flows
- Confidence threshold 0.75 enforced
- Tests 4, 5, 15 green
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
npm run test -- --testPathPattern="requirements|langflow|initial-email"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: LLM output validation and first customer email send.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-003 Langflow URL/auth — env config
- OD-001 email provider — mock adapter until confirmed

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-79](https://linear.app/sellgenius-dev/issue/SEL-79/task-05-requirements-langflow-classification-initial-email)  
Linear status: Backlog

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (requirement labels, confidence 0.75, Langflow boundaries, 2026-06-17)  
Depends on: task-02, task-04  
Blocks: task-06

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-79)

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
