# Task: Requirements + Langflow Classification + Initial Email

Status: Done — Human Architect approved 2026-06-25  
Stage: Domain | Use Case | Integration  
Mode: Codex Audit  
Owner: Human Architect  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-25

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-79](https://linear.app/sellgenius-dev/issue/SEL-79)  
PR: TBD  
Depends on: task-02, task-12, OD-015 (resolved 2026-06-24)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-langflow-tools.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: After template match, selected notes must become classified workflow_requirements before any customer email is sent.
- Technical: Langflow classify + draft flows invoked via LangflowProvider; NestJS validates all LLM output; SideEffectService sends initial email. **Capability hygiene:** standalone use cases only — do not extend `StartWorkflowUseCase` monolith (see task-12, OD-009).
- Current behavior: `MatchWorkflowTemplateUseCase` runs two-stage match; persists `car_template_id`; selected notes from `notes_*` columns available for classification (2026-06-24).
- Target behavior: Langflow classify → validate → persist requirements → Langflow draft initial email → validate → SEND_INITIAL_EMAIL side effect → WAITING_FOR_CUSTOMER_REPLY. Each step is a **separate invokable use case** returning `CapabilityResult` (internal; OD-010).

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
- task-12 complete: `deal_context_json` on workflow; `GetWorkflowContextUseCase` available for Langflow read tools
- `car_template_id` restored on `postsale_workflows` (migration `20260624100000_recreate_car_templates_wide.sql`)
- Workflow reaches `TEMPLATE_MATCHED` when Stage 1+2 succeed; zero notes is valid per decision-log 2026-06-24

Technology OPEN_DECISIONs:

- OD-003 Langflow hosting URL/auth
- OD-001 email provider (mock in tests)
- OD-009 capability decomposition — follow standalone use-case rule in this task

## Goal

Expected result:

- LangflowProvider + classify and email-draft parsers
- Notes/requirements input source per **OD-015** (not `car_template_notes` — removed)
- CreateRequirementsUseCase: classify → validate confidence ≥ 0.75 → reject unsafe → persist
- SendInitialEmailUseCase: draft via Langflow → validate → side_effect_record → send
- Each mutating use case returns `CapabilityResult` with draft `allowedNextActions` per design doc guard matrix
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
- `src/lib/domain/capability-result.domain.ts` (extend usage if task-12 landed)
- Langflow output schemas for classification and email draft
- langflow_runs audit persistence

Likely files/areas:

- `src/domains/requirements/use-cases/create-requirements.use-case.ts`
- `src/domains/email/use-cases/send-initial-email.use-case.ts`
- `src/domains/langflow/parsers/classify-notes.parser.ts`
- `src/integrations/langflow/langflow.adapter.ts`

## Forbidden Scope

Do not change:

- Template matching / notes persistence — **removed 2026-06-23**; OD-015 owns replacement design
- Completion or follow-up policies (task-07)

Do not implement:

- Reply ingestion (task-06)
- Completion policy (task-07)
- Bitrix write (task-08)
- n8n webhook controllers (task-08)
- Public capability HTTP/MCP routes (V2 / OD-008)
- Workflow-wide agent loop runtime (V3)

Do not touch:

- Langflow forbidden direct tools (must not be added)
- `StartWorkflowUseCase` — **do not add requirements or email logic there**; n8n start remains task-04/12 orchestrator only

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

- CreateRequirementsUseCase and SendInitialEmailUseCase as **standalone** capabilities (workflow_id in Command)
- CreateRequirements reads vehicle/product context via `GetWorkflowContextUseCase` or repository — **never** Bitrix read in this task
- Confidence threshold 0.75 enforced in validator
- langflow_runs row for each invocation
- Langflow classify flow may use read tools (`get_workflow_context`, `get_selected_template_notes`) — task-local agent loop (level A)

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
- integration: CreateRequirements uses persisted `deal_context_json` + OD-015 notes source (not Bitrix)
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
- CreateRequirementsUseCase / SendInitialEmailUseCase standalone; StartWorkflowUseCase unchanged by this task
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
Linear status: Ready (repo; SEL-85 / task-12 Done — sync Linear SEL-79 from Backlog)

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: Codex audit APPROVED_FOR_HUMAN_REVIEW 2026-06-25 (re-audit after Fix); Review APPROVED_FOR_CODEX_AUDIT 2026-06-25  
Related QA evidence: mocked Langflow/Email in unit tests; side_effect SEND_INITIAL_EMAIL idempotency in send-initial-email.use-case.spec.ts  
Related decisions: `docs/decision-log.md` (requirement labels, confidence 0.75, Langflow boundaries, 2026-06-17)  
Depends on: task-02, task-12, **OD-015**  
Blocks: task-06

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-79)
2026-06-19 - Updated - Capability / agent-loop requirements; depends on task-12; standalone use cases (OD-009)
2026-06-19 - Updated - Docs Fala A: Linear status Ready (SEL-79 unblocked; sync Linear)
2026-06-23 - Updated - Blocked on OD-015 after full template persistence removal
2026-06-24 - Updated - Implementation complete; Codex audit APPROVED after boundary fix (parse-before-persist, zero-notes, stable error codes)
2026-06-25 - Fix - CRLF/LF normalization + Prettier on 7 Langflow integration/test files; Implementation Final Report restored; harness-check PASS (124 tests)
2026-06-25 - Review - APPROVED_FOR_CODEX_AUDIT; harness-check PASS; acceptance criteria verified; QUALITY_SCORE 78/100
2026-06-25 - Codex Audit - APPROVED_FOR_HUMAN_REVIEW; harness-check PASS; boundary parsing, scope, and reports verified after Fix
2026-06-25 - Human Architect - Approved; merge authorized

## Codex Audit Report (2026-06-25)

Verdict: APPROVED_FOR_HUMAN_REVIEW

Summary: Re-audit after Fix (CRLF/lint) and Review pass. task-05 aligns with scope, acceptance criteria, and architecture boundaries. Parse-before-persist enforced; no raw LLM in `langflow_runs`; standalone use cases; side_effect before email send.

Task audited: task-05

Risk category: High (LLM + customer messaging + DB)

Changed files audited: task-05 implementation scope per Implementation Final Report; Fix files (7 Langflow integration/test)

PR/Diff status: TBD (working tree)

Checks audited: `bash ./scripts/harness-check` PASS; lint, typecheck, test (124/124), build PASS

Runtime evidence audited: Mock Langflow/Email unit tests; baseline cases 4, 5, 15; side_effect idempotency; INITIAL_EMAIL_SENT audit path

Boundary parsing status: PASS — parsers validate before persist/send; stable `validation_errors` codes

Architecture status: PASS — Provider boundaries; StartWorkflowUseCase unchanged

Security issues: None blocking; production adapters remain stubs (OD-001, OD-003)

Reliability issues: None blocking; idempotent SEND_INITIAL_EMAIL via side_effect_record

Observability issues: None blocking; langflow_runs parse-only audit metadata

ExecPlan status: Aligned — task-05 done

Linear status: SEL-79 — sync to Done after merge

AI slop / golden-rule issues: None blocking

OPEN_DECISIONs: None blocking (OD-001, OD-003 non-blocking)

Required fixes: None

Tech debt: Apply migration `20260624200000_langflow_runs_parse_audit` before prod deploy

Next recommended mode: Human Architect — merge approval

## Review Report (2026-06-25)

Verdict: APPROVED_FOR_CODEX_AUDIT

Summary: task-05 implementation reviewed after Fix pass. Standalone use cases, parse-before-persist, side_effect before email, and baseline tests 4/5/15 verified. All harness checks green. High-risk path (LLM + customer email + DB) requires Codex re-audit.

Task reviewed: task-05

Changed files reviewed: task-05 scope per Implementation Final Report; Fix touched 7 Langflow integration/test files + task doc

PR/Diff status: TBD (working tree)

Checks reviewed: `bash ./scripts/harness-check` PASS; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` 124/124 PASS (31 suites); `npm run build` PASS

Acceptance criteria status:

- Requirements persisted only after validation — PASS (`create-requirements.use-case.spec.ts`)
- Standalone use cases; StartWorkflowUseCase unchanged — PASS (no imports of CreateRequirements/SendInitialEmail in start-workflow)
- Initial email only after requirements — PASS (case 5)
- langflow_runs audit — PASS (`LangflowRunRecorderService` writes `parsed_success`, `validation_errors`; `raw_output` null)
- Confidence ≥ 0.75 — PASS (case 15)
- Tests 4, 5, 15 — PASS
- harness-check — PASS

Runtime validation status: PASS (mock Langflow/Email per task Technology Context; side_effect idempotency and INITIAL_EMAIL_SENT path covered in unit tests; live E2E deferred task-08/OD-001)

Boundary parsing status: PASS — classify-notes.parser, email-draft.parser, classification-validation; parse failure escalates without persist/send

Architecture status: PASS — use-case → LangflowProvider/EmailProvider; no Langflow SDK in use cases; forbidden scope respected

Model separation status: PASS — DTO/Command/Domain/Persistence separation per task

Security/reliability/observability issues: No new blocking issues. Production email/Langflow still on stubs (OD-001, OD-003). Migration `20260624200000_langflow_runs_parse_audit` must be applied before prod deploy.

ExecPlan status: task-05 marked done in Progress — aligned

Linear status: SEL-79 Ready in repo; sync after Human Architect merge

Golden-rule / AI slop issues: None blocking; CRLF regression fixed

OPEN_DECISIONs: None blocking (OD-001, OD-003 non-blocking)

Codex Audit required: YES

QUALITY_SCORE update: 78/100 (Review 2026-06-25)

Required fixes: None — proceed to Codex re-audit

Next recommended mode: Codex Audit

## Implementation Final Report

Summary: Standalone `CreateRequirementsUseCase` and `SendInitialEmailUseCase` deliver Langflow classify → validate → persist requirements → Langflow draft → validate → `SEND_INITIAL_EMAIL` side effect. Parse-before-persist on all LLM output; `langflow_runs` stores `parsed_success` and stable `validation_errors` only (`raw_output` NULL). OD-015 zero-notes path escalates without Langflow invoke.

Changed files: `src/domains/requirements/use-cases/create-requirements.use-case.ts`, `src/domains/email/use-cases/send-initial-email.use-case.ts`, `src/domains/langflow/parsers/` (classify-notes, email-draft, classification-validation), `src/integrations/langflow/` (adapter, parsers, flow-ids, specs), `src/integrations/supabase/` (langflow-run, outgoing-message, workflow-requirement repos), `supabase/migrations/20260624200000_langflow_runs_parse_audit.sql`, domain types in `src/lib/domain/`, unit tests (`create-requirements`, `send-initial-email`, `classify-notes`, `classification-validation`, `langflow.adapter`, `langflow-response.parser`), test helpers (mock Langflow/Email, in-memory repos)

Checks run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `bash ./scripts/harness-check`

Result: Implementation complete — acceptance criteria 4, 5, 15 covered in unit tests; `StartWorkflowUseCase` unchanged

Risks: First customer email path (high); production send blocked on OD-001 real EmailProvider adapter; Langflow production config OD-003

OPEN_DECISIONs: OD-001 (email provider, non-blocking mock in tests), OD-003 (Langflow URL/auth, non-blocking env)

Codex Audit required: YES — LLM output validation + customer messaging

Linear update: SEL-79 remains Ready in repo until Human Architect merge

ExecPlan update: task-05 marked done in Progress (implementation)

PR/Diff: TBD

Next recommended mode: Review (then Codex re-audit)

## Fix Final Report (2026-06-25)

Summary: Codex re-audit blocked on 348 Prettier errors (CRLF in 7 `src/integrations/langflow` files) and missing Implementation Final Report. Fixed line endings and `langflow.module.ts` providers formatting; restored Implementation Final Report in this task doc.

Fixed issues:

- Prettier `Delete ␍` (CRLF) on `langflow-flow-ids.ts`, `langflow-response.parser.ts`, `langflow.adapter.error.ts`, `langflow.adapter.ts`, `langflow-response.parser.spec.ts`, `langflow.adapter.spec.ts`
- Prettier providers-array formatting on `langflow.module.ts`
- Missing Implementation Final Report in `docs/tasks/task-05.md`

Changed files: 7 TypeScript files under `src/integrations/langflow/` and `src/tests/unit/`; `docs/tasks/task-05.md`

Checks run: `npm run lint` (0 errors), `npm run typecheck`, `npm test` (31 suites, 124/124 PASS), `npm run build`, `bash ./scripts/harness-check` (PASS)

Result: Fix complete, pending Review

Risks: None from formatting fix; task-05 remains high-risk for Codex (LLM + email + DB)

OPEN_DECISIONs: None blocking (OD-001, OD-003 non-blocking)

Codex Audit required: YES (re-audit after Review)

Linear update: none

ExecPlan update: none (implementation scope unchanged)

PR/Diff: working tree

Next recommended mode: Review

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
