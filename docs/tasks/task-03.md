# Task: Template Import + Car Template Matching

Status: Done  
Stage: Domain | Use Case | Persistence | Integration  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: Medium  
Created: 2026-06-17  
Last updated: 2026-06-18

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-78](https://linear.app/sellgenius-dev/issue/SEL-78)  
PR: https://github.com/SebastianZakrzewski/postsale_agent_V1/pull/4 (merged)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Workflow requires EVAMATS template data and exact/alias car matching before requirements are created.
- Technical: One-time import from Excel/Sheet into Supabase; matching logic owned by NestJS template-matching module.
- Current behavior: Empty template tables from task-01 schema only.
- Target behavior: CLI or API-triggered import batch; MatchTemplateUseCase returns MATCHED | NOT_FOUND | AMBIGUOUS; SelectNotesUseCase filters by product + body type.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase (template_import_batches, car_templates, car_template_notes)

Integrations:

- Excel/CSV file read (local path or upload DTO for V1)

Testing/runtime validation tools:

- Jest with sanitized fixture rows

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-01 schema exists
- EVAMATS sample file provided later (OD-006)

Technology OPEN_DECISIONs:

- OD-006 EVAMATS Excel column schema

## Goal

Expected result:

- ImportTemplateBatchUseCase: parse Excel/Sheet → car_templates + car_template_notes + template_import_batches
- Normalize brand/model/body/generation
- MatchTemplateUseCase: exact match first, alias second
- SelectNotesUseCase: filter notes by product + body type
- raw_row_json preserved on car_templates

Complete when:

- Import stores batch metadata and row count
- 0 matches → NOT_FOUND; 2+ matches → AMBIGUOUS; 1 → MATCHED
- Tests cover baseline cases 2 and 3 (escalation inputs)

## Scope

Allowed changes:

- `src/domains/template-import/`
- `src/domains/template-matching/`
- Import script or admin endpoint (internal, auth required)
- Alias table or alias column strategy per schema from task-01
- Fixture files in `src/tests/fixtures/` (sanitized sample rows)
- Column mapping config for OD-006

Likely files/areas:

- `src/domains/template-import/use-cases/import-template-batch.use-case.ts`
- `src/domains/template-matching/use-cases/match-template.use-case.ts`
- `src/domains/template-matching/use-cases/select-notes.use-case.ts`
- `src/domains/template-import/parsers/excel-row.parser.ts`

## Forbidden Scope

Do not change:

- Product spec matching rules (exact + alias only)
- Schema table shapes from task-01

Do not implement:

- Langflow, email, Bitrix writes
- Fuzzy matching (V2)
- Scheduled template sync (V2)
- postsale_workflows mutations

Do not touch:

- Workflow orchestration (task-04)
- Requirements or Langflow modules

## Business Behavior

Expected:

- Exactly one template match → MATCHED with car_template_id
- Zero or multiple matches → return escalation reason (no guess)
- Selected notes filtered by product + body type

Forbidden:

- Fuzzy or ML matching in V1
- Proceeding with ambiguous template
- Silent default when multiple templates match

Edge cases:

- Missing normalization fields → NOT_FOUND or insufficient data flag
- Empty notes for product+body → escalate signal to caller
- Malformed Excel row → skip or fail batch with audit metadata

## Technical Requirements

Implementation:

- Normalization service for brand/model/body/generation
- Import batch tracks row counts and errors
- Alias lookup after exact match fails

Architecture:

- Use-case → Service → Repository
- Excel parser at boundary only

Model separation:

- DTO: ImportRowDto, ImportBatchRequestDto
- Command: `ImportTemplateBatchCommand`, `MatchTemplateCommand`, `SelectNotesCommand`
- Domain: `TemplateMatchResult`, `CarTemplate`, `TemplateNote`, `TemplateMatchStatus`
- Persistence: car_templates.raw_row_json as JSONB
- Integration Payload: raw Excel row shape (untrusted)
- LLM Output: none

Boundary parsing:

- input source: Excel/CSV rows, API upload DTO
- parser/schema/mapper: `excel-row.parser.ts` → ImportRowDto → Command
- trusted output type: Domain templates and notes
- failure mode: reject invalid rows; do not import partial ambiguous keys silently
- forbidden side effects before parse: no workflow creation from raw Excel

Providers:

- auth: required on import endpoint if exposed via API
- CRM/connectors: none
- telemetry: import batch logging
- feature flags: none
- LLM: none
- messaging: none
- payments: none

## State Changes

Allowed:

- template_import_batches, car_templates, car_template_notes writes during import

Forbidden:

- postsale_workflows mutations
- Customer email or Bitrix side effects

Side effects:

- None external

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: normalization rules
- unit: exact match before alias
- unit: ambiguous → AMBIGUOUS status
- unit: no match → NOT_FOUND
- integration: import batch creates expected row counts
- regression: existing harness and NestJS tests still pass
- forbidden behavior: no workflow created from import alone
- edge case: empty notes for product+body returns escalation signal

Test format:

```text
Given: two templates with same normalized key
When: MatchTemplateUseCase runs
Then: AMBIGUOUS, no car_template_id selected
Forbidden side effect: workflow creation
```

## Runtime Validation

Runtime Validation: NO

If YES, evidence required: N/A

If NO, reason:

- Batch import and matching validated via unit/integration tests; workflow runtime evidence collected in task-09.

## Acceptance Criteria

- One-time import path documented with sample command
- MatchTemplateUseCase implements exact + alias only
- SelectNotesUseCase filters by product + body type
- Tests for NOT_FOUND and AMBIGUOUS (cases 2, 3 inputs)
- OD-006 column mapping documented in config when sample file available
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
npm run test -- --testPathPattern="template"
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Template wrong-match risk affects customer communication content.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-006 EVAMATS column schema — use config file updatable when sample arrives

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-78](https://linear.app/sellgenius-dev/issue/SEL-78/task-03-template-import-car-template-matching)  
Linear status: Done

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: https://github.com/SebastianZakrzewski/postsale_agent_V1/pull/4 (merged 2026-06-18)  
Related reviews: Codex Audit APPROVED_FOR_HUMAN_REVIEW (2026-06-18); Human Architect approved 2026-06-18  
Related QA evidence: harness-check PASS (49 tests); PROD import verified via task-11 (2719 templates, 2169 notes)  
Related decisions: `docs/decision-log.md` (template matching policy, 2026-06-17)  
Depends on: task-01  
Blocks: task-04, task-05

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-78)  
2026-06-18 - Implemented - ImportTemplateBatchUseCase, MatchTemplateUseCase, SelectNotesUseCase, normalization, Excel parser, EVAMATS slug mappings, CLI (`scripts/import-evamats.ts`), unit/integration tests  
2026-06-18 - Fix (Codex Audit) - Parse workbook before batch create; mark batch `failed` on import error; CLI supports `--file=` and `--file path`; structured `template_import.batch_failed` log added  
2026-06-18 - Codex Audit - APPROVED_FOR_HUMAN_REVIEW (re-audit after fix pass)  
2026-06-18 - Human Architect - Approved  
2026-06-18 - Merged - PR #4 squash-merged to `postsale-agent-v1/task-01-foundation`; Linear SEL-78 → Done

## Implementation Final Report

Summary: Template import and car template matching delivered. One-time import via `scripts/import-evamats.ts`; matching via exact key then alias; notes filtered by product + body type. Codex Audit fix pass: parse-before-write, failure batch status, CLI arg parsing.

Changed files: `src/domains/template-import/`, `src/domains/template-matching/`, `scripts/import-evamats.ts`, `src/lib/cli/parse-file-arg.ts`, tests under `src/tests/`

Checks run: `bash ./scripts/harness-check`, `npm test -- --testPathPattern=template`

Result: Done — Human Architect approved 2026-06-18

Risks: Wrong template match affects customer communication content; Supabase service_role token leaked in chat — operational rotation required outside repo

OPEN_DECISIONs: OD-006 column mapping implemented in `evamats-slug-mappings.ts` (non-blocking; Human Architect has not closed OD-006). OD-004 non-blocking.

Codex Audit required: YES (re-audit after fix pass)

Linear update: SEL-78 → Done; completion summary in issue description (2026-06-18)

ExecPlan update: task-03 marked done in Progress

PR/Diff: https://github.com/SebastianZakrzewski/postsale_agent_V1/pull/4 — squash-merged to `postsale-agent-v1/task-01-foundation`

Next recommended mode: Implementation — task-04

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
