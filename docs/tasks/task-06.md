# Task: Customer Reply Ingestion, Langflow Analysis, Evidence Storage

Status: Done — Codex APPROVED_FOR_HUMAN_REVIEW 2026-06-26  
Stage: Use Case | Integration | API  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-26

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-81](https://linear.app/sellgenius-dev/issue/SEL-81)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-langflow-tools.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`.

## Context

Why this task exists:

- Business: Customer replies by email with text, attachments, and links; system must analyze against requirements and store evidence before completion policy runs.
- Technical: Inbound email normalized from n8n DTO; Langflow analyze-customer-reply with **task-local agent loop** (read tools + propose); evidence persistence with VALID-without-evidence guard. **Standalone** `IngestReplyUseCase` and `AnalyzeReplyUseCase` — do not merge into a monolithic reply handler.
- Current behavior: Workflow WAITING_FOR_CUSTOMER_REPLY without reply handling.
- Target behavior: IngestReplyUseCase → customer_messages, message_attachments, message_links → AnalyzeReplyUseCase → requirement_evidence + status updates → REQUIREMENTS_UPDATED.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (customer_messages, message_attachments, message_links, requirement_evidence, workflow_requirements, langflow_runs)

Integrations:

- Langflow analyze-customer-reply flow
- Inbound email payload (from n8n, parsed in this task)

Testing/runtime validation tools:

- Jest with mocked LangflowProvider and sample email payloads

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-05 initial email established reply threading strategy (document in code)
- Separate tables for attachments and links per architecture decision

Technology OPEN_DECISIONs:

- OD-001 inbound DTO — **resolved 2026-06-25** (Gmail via n8n; canonical shape in `docs/decision-log.md`)

## Goal

Expected result:

- Inbound email DTO parser → IngestReplyCommand
- Reply-to-workflow matching (thread id / deal reference — document strategy)
- AnalyzeReplyUseCase with Langflow + evidence persistence
- Evidence types: TEXT_FRAGMENT, EMAIL_ATTACHMENT, EXTERNAL_LINK, MANUAL_APPROVAL
- Workflow status → REQUIREMENTS_UPDATED

Complete when:

- Case 6: unmatched reply escalates
- Case 7: VALID without evidence rejected
- Partial reply leaves requirements non-VALID
- Attachments and links in separate tables

## Scope

Allowed changes:

- `src/domains/email/inbound/` parsers and use cases
- `src/domains/requirements/use-cases/analyze-reply.use-case.ts` (or postsale-workflows)
- Langflow analyze-reply parser
- Link extraction from email body
- requirement_evidence repository and guards

Likely files/areas:

- `src/domains/email/use-cases/ingest-reply.use-case.ts`
- `src/domains/email/parsers/inbound-email.parser.ts`
- `src/domains/langflow/parsers/analyze-reply.parser.ts`
- `src/domains/requirements/services/evidence-guard.service.ts`

## Forbidden Scope

Do not change:

- Initial email flow (task-05)
- Completion/follow-up policies (task-07)

Do not implement:

- Completion policy execution (task-07)
- Follow-up send (task-07)
- Bitrix write (task-08)
- n8n webhook controller wiring (task-08)
- Workflow-wide agent loop (V3)

Do not touch:

- CompletionPolicy rules
- StartWorkflowUseCase or requirements monolith merge

## Business Behavior

Expected:

- Every VALID requirement has at least one requirement_evidence row
- PARTIAL / PENDING / UNCLEAR allowed until policy runs in task-07
- CUSTOMER_REPLY_RECEIVED and REPLY_ANALYSIS_ACCEPTED audit events

Forbidden:

- VALID without evidence
- Treating incomplete reply as all requirements VALID
- Incomplete reply treated as complete (critical product rule)

Edge cases:

- Reply cannot match workflow → escalate (case 6)
- Analysis proposes VALID without evidence_proposals → reject (case 7)
- Multiple attachments and links stored separately

## Technical Requirements

Implementation:

- IngestReplyUseCase and AnalyzeReplyUseCase as **separate** capabilities (`workflow_id` scoped)
- AnalyzeReplyUseCase returns `CapabilityResult`; Langflow may `propose_completion | propose_followup | propose_manual_review` — NestJS validates, does not auto-complete (task-07)
- Langflow analyze flow uses read tools: `get_workflow_requirements`, `get_customer_messages`, `get_previous_evidence`
- Evidence guard at persistence boundary
- langflow_runs for analyze flow

Architecture:

- Parse inbound DTO before use-case
- Parse Langflow analysis before status updates

Model separation:

- DTO: n8n inbound email webhook shape (untrusted)
- Command: `IngestReplyCommand`, `AnalyzeReplyCommand`
- Domain: `CustomerMessage`, `RequirementEvidence`, `ReplyAnalysisResult`
- Persistence: customer_messages, message_attachments, message_links, requirement_evidence rows
- Integration Payload: raw email webhook JSON
- LLM Output: analyze-reply JSON (untrusted until parsed)

Boundary parsing:

- input source: n8n email webhook DTO; Langflow analysis JSON
- parser/schema/mapper: `inbound-email.parser.ts`, `analyze-reply.parser.ts`
- trusted output type: IngestReplyCommand, ReplyAnalysisResult
- failure mode: escalate unmatched reply; reject invalid analysis
- forbidden side effects before parse: no VALID status from raw LLM output

Providers:

- auth: deferred to task-08 for webhook
- CRM/connectors: none
- telemetry: workflow_id on ingest and analysis
- feature flags: none
- LLM: LangflowProvider (analyze flow)
- messaging: none (inbound parse only; send in task-07)
- payments: none

## State Changes

Allowed:

- customer_messages, message_attachments, message_links inserts
- requirement_evidence inserts
- workflow_requirements status updates (not VALID without evidence)
- langflow_runs inserts
- postsale_workflows → REQUIREMENTS_UPDATED

Forbidden:

- COMPLETED or ESCALATED terminal transitions (task-07/08)
- Bitrix update
- Follow-up email send

Side effects:

- None external in this task (ingest is persistence only)

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: unmatched reply triggers escalation (case 6)
- unit: VALID without evidence rejected at guard (case 7)
- integration: attachments and links in separate tables
- integration: partial reply leaves some requirements non-VALID
- regression: task-05 requirements unchanged by ingest-only path
- forbidden behavior: no VALID without evidence row
- edge case: multiple links extracted from body

Test format:

```text
Given: reply cannot match any active workflow
When: IngestReplyUseCase runs
Then: escalation triggered
Forbidden side effect: requirement VALID assignment

Given: analysis proposes VALID without evidence_proposals
When: AnalyzeReplyUseCase validates
Then: rejection, no VALID status persisted
Forbidden side effect: COMPLETED workflow transition
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: not required until task-08 webhooks
- no-console-error: not required
- sandbox/mock integration: mocked ingest and Langflow payloads
- structured log/audit event: CUSTOMER_REPLY_RECEIVED, REPLY_ANALYSIS_ACCEPTED, evidence records
- trace/request/workflow ID: workflow_id, langflow_run_id
- idempotency: duplicate message ingest handled safely if applicable

If NO, reason: N/A

## Acceptance Criteria

- Attachments and links stored in separate tables
- Evidence linked to requirement_id
- Unmatched reply escalates (case 6)
- VALID without evidence impossible at persistence layer (case 7)
- Tests 6, 7 pass
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
npm run test -- --testPathPattern="reply|evidence|ingest"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Evidence rules and LLM reply analysis — critical forbidden outcome (incomplete ≠ complete).

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-001 email provider affects inbound DTO shape — adapter-specific parser

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-81](https://linear.app/sellgenius-dev/issue/SEL-81/task-06-reply-ingestion-langflow-analysis-evidence-storage)  
Linear status: Ready for PR — sync SEL-81 to In Review after merge opened

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (evidence types, forbidden VALID without evidence, 2026-06-17)  
Depends on: task-05  
Blocks: task-07

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-81)
2026-06-19 - Updated - Standalone reply capabilities; Langflow level-A agent loop; CapabilityResult (OD-009)
2026-06-25 - Updated - Implementation complete; Gmail/n8n inbound DTO; cases 6–7; harness-check PASS
2026-06-26 - Updated - Fix (Codex re-audit): duplicate idempotency retry rematches instead of false unmatched
2026-06-26 - Updated - Codex Audit APPROVED_FOR_HUMAN_REVIEW; Cleanup pre-PR

## Fix Report (2026-06-26)

Summary: Unmatched reply escalation (`escalated_unmatched` + idempotency + structured log with `from_email_hash`); UNIQUE `external_message_id`; duplicate ingest → `already_ingested`; retry after partial failure rematches and completes ingest.

Changed files: `ingest-reply.use-case.ts`, `escalate-unmatched-reply.use-case.ts`, `supabase-customer-message.repository.ts`, migration `20260626100000_task06_customer_message_idempotency.sql`, tests, `docs/decision-log.md`

Checks run: `npm test` 146/146 PASS; `npm run lint/build` PASS; `bash ./scripts/harness-check` PASS

Result: Codex re-audit blockers resolved

Next recommended mode: Human Approval → PR

## Codex Audit Report (2026-06-26)

Verdict: APPROVED_FOR_HUMAN_REVIEW

Summary: Standalone ingest/analyze use cases; evidence guard; Case 6/7; idempotency + retry path; no raw LLM persistence; forbidden scope respected.

Checks: harness-check PASS; 146/146 tests PASS

Tech debt: optional `langflow_run_id` in analysis audit payloads; unmatched escalation is log-only until task-08 Telegram

Next recommended mode: Human Approval → PR

## Implementation Final Report

Summary: Standalone `IngestReplyUseCase` and `AnalyzeReplyUseCase` — inbound n8n/Gmail DTO parsing, thread matching via `outgoing_messages.provider_message_id`, customer_messages/attachments/links persistence, Langflow analyze-reply with evidence guard (no VALID without evidence), workflow → REQUIREMENTS_UPDATED.

Changed files: `src/domains/email/`, `src/domains/requirements/`, `src/integrations/supabase/`, tests, `docs/decision-log.md`

Checks run: `bash ./scripts/harness-check`; `npm test` 146/146 PASS

Result: Implementation complete — cases 6, 7; partial reply; attachments/links separate tables

Risks: High (LLM reply analysis + evidence rules); webhook wire deferred task-08; attachment bytes via n8n contentRef not fetched in V1

OPEN_DECISIONs: None blocking (OD-001 partially resolved — inbound DTO in decision-log)

Codex Audit required: YES — APPROVED_FOR_HUMAN_REVIEW 2026-06-26

Linear update: SEL-81 → sync In Review when PR opened

ExecPlan update: task-06 Done (synced 2026-06-26)

PR/Diff: working tree — ready after Cleanup

Next recommended mode: Human Approval → PR

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
