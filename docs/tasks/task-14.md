# Task: Bitrix Product + Set-Variant → Template Note Selection

Status: Cancelled  
Stage: Domain | Contracts | Integration | QA  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: Medium  
Created: 2026-06-19  
Last updated: 2026-06-23  
Cancelled: 2026-06-23 — Human Architect removed all template/notes persistence and mapping from V1 (see `docs/decision-log.md` 2026-06-23).

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / TBD (SEL-87 proposed)  
PR: TBD  
Depends on: task-03 (template notes schema), task-04 (Bitrix read path), task-12 (`deal_context_json` persistence), task-13 (template match accuracy — end-to-end audit assumes MATCHED templates)

Split from: task-13 Review (2026-06-19) — changes were **out of scope** for template matching; deferred here per Forbidden Scope in `docs/tasks/task-13.md`.

## Cancellation (2026-06-23)

**This task is cancelled.** Human Architect removed all template/notes persistence, Bitrix product→slug mapping, and in-app note selection. Historical sections below document the **abandoned** design only. See `docs/decision-log.md` (2026-06-23) and `docs/open-decisions.md` (OD-015).

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/decision-log.md` (OD-004 Bitrix fields), `docs/open-decisions.md`, `docs/tasks/task-03.md`, `docs/tasks/task-05.md`, `docs/tasks/task-13.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: After template match (task-13), workflow must load the correct `car_template_notes` for the deal's **product line** (3D vs classic) and **set variant** (front/rear/trunk/third row/etc.). Wrong notes → wrong customer questions and unsafe Langflow classification (task-05).
- Technical: Bitrix stores product as a string field (`UF_CRM_1781552572183`) with enum fallback (`UF_CRM_1757024835301`) and set variant as enum (`UF_CRM_1757024931236`). EVAMATS notes use slugs like `front_3d`, `rear_classic`, `trunk`, `trunk_general`, `third_row`, `general`. Prior `TemplateNotesService` filtered by a single `normalizeProduct(product)` slug — insufficient for multi-part sets.
- Current behavior (pre-task-14): `parseBitrixDeal` exposes only raw `product` string; `SelectNotesCommand` uses one product slug; deals with «Przód + Tył + Bagażnik» often return `requiresEscalation: true` despite a MATCHED template.
- Target behavior: Parse Bitrix product + set variant at boundary → persist `noteProductSlugs` (+ escalation flags) on `DealContext` → `TemplateNotesService` loads notes for all resolved slugs (deduped) filtered by `body_type`.

## Baseline (2026-06-19, live Bitrix + Supabase PROD, post task-13 template uplift)

Full stage audit (`scripts/batch-stage-full-audit.ts`, artifact `scripts/.full-audit-all-stages.json`):

| Metric                              |     Value |
| ----------------------------------- | --------: |
| Template arithmetic mean (5 stages) | **94.5%** |
| Notes arithmetic mean (5 stages)    | **16.0%** |
| End-to-end (template + notes OK)    | **15.1%** |

Primary failure mode in audit: `NO_NOTES_FOR_SLUGS` — template MATCHED but product/set-variant not mapped to existing `car_template_notes.product` slugs (e.g. deal `33950` «Przód + Tył» → expected `front_3d`, `rear_3d`, `general`).

Benchmark tooling:

- `scripts/batch-stage-full-audit.ts [--save path.json]` — template + notes per deal on five `STATUS_ID`s
- Reuse task-13 stage cohort definitions (`NEW`, `PREPARATION`, `UC_ZQ68O2`, `EXECUTING`, `FINAL_INVOICE`)

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase read: `car_template_notes` via `CarTemplateRepository.findNotesByTemplateId`
- `postsale_workflows.deal_context_json` (task-12) — serialize/deserialize new DealContext fields

Integrations:

- Bitrix24 read only (parser boundary); no CRM writes

Testing/runtime validation tools:

- Jest unit tests for mapping config, parser, notes service
- `batch-stage-full-audit.ts` for live acceptance benchmark

Deployment target:

- OD-002 (non-blocking)

Technology assumptions:

- task-11 EVAMATS notes loaded; task-13 template match baseline ≥ 90% arithmetic mean
- Bitrix field IDs for `productEnum` and `setVariant` match `DEFAULT_BITRIX_FIELD_MAPPING` (empirical; extend OD-004 if Human confirms)

Technology OPEN_DECISIONs:

- **OD-014** (non-blocking, proposed): Notes hit-rate acceptance floor for five-stage audit — recommended default **≥ 60%** arithmetic mean notes OK (baseline 16%); remaining gaps may be missing EVAMATS note rows (OD-013), not mapping code
- OD-013 (non-blocking): missing note rows in `car_template_notes` for some templates/products

## Goal

Expected result:

- Deterministic mapping: Bitrix product label + set-variant enum ID + canonical body type → `noteProductSlugs[]`
- `DealContext` carries `noteProductSlugs`, `setVariantId`, `setVariantLabel`, `productSource`, escalation flags (`requiresCustomProductEscalation`, `requiresSetVariantEscalation`)
- `TemplateNotesService` selects notes across multiple product slugs; escalates when slugs empty or no rows found
- Escalation without notes for: «Niestandardowy» product, unknown set variant, driver/passenger mat variants (`1300`, `1310`)
- Five-stage notes arithmetic mean **≥ 60%** on live audit (or Human Architect floor in decision-log / OD-014)
- Zero regression: template match rates from task-13 baseline unchanged

Complete when:

- All acceptance criteria pass
- Implementation isolated from task-13 PR (matching-only)
- task-05 can consume persisted `noteProductSlugs` from workflow context

## Scope

Allowed changes:

### Bitrix boundary parsing

- `src/domains/bitrix/config/bitrix-product-note-mapping.ts` — product line, set-variant → note slug templates
- `src/domains/bitrix/config/bitrix-field-mapping.ts` — `productEnum`, `setVariant` field IDs (if not already merged)
- `src/domains/bitrix/parsers/bitrix-deal.parser.ts` — resolve product label, set variant, note slugs at parse boundary

### Domain + notes selection

- `src/lib/domain/deal-context.domain.ts` — new optional fields
- `src/lib/commands/template.commands.ts` — `noteProductSlugs` on `SelectNotesCommand`
- `src/domains/template-matching/services/template-notes.service.ts` — multi-slug note load + dedupe
- `src/lib/persistence/mappers/postsale-workflow.mapper.ts` — round-trip `deal_context_json` fields

### Tests

- `src/tests/unit/bitrix-product-note-mapping.spec.ts`
- `src/tests/unit/bitrix-deal.parser.spec.ts` (note slug expectations)
- `src/tests/unit/bitrix-field-mapping.spec.ts` (productEnum / setVariant keys)
- `src/tests/unit/template-notes.service.spec.ts` (multi-slug selection)

### Benchmark / QA

- `scripts/batch-stage-full-audit.ts` (commit if uncommitted)
- Benchmark JSON artifact: `scripts/.notes-audit-baseline.json` (iter-0) and `scripts/.notes-audit-final.json` (acceptance)

Likely files/areas:

- See above; wire `SelectNotesUseCase` only if needed for integration test — full orchestration remains task-05

## Forbidden Scope

Do not change:

- `TemplateMatchingService` / `template-match-resolution.util.ts` (task-13)
- CRM normalization for vehicle match keys beyond `normalizeCrmBodyType` usage in trunk slug resolution (task-13)
- `StartWorkflowUseCase` orchestration semantics (task-04 / task-12)
- Langflow, email send, requirements persistence (task-05)
- Bitrix stage writes, n8n webhooks (task-08)
- `car_templates` DML, aliases, dedup (task-13)

Do not implement:

- LLM-based note selection
- Fuzzy product matching
- Customer messaging
- New EVAMATS note row authoring (OD-013) — escalate remaining `NO_NOTES_FOR_SLUGS` where slugs are correct but rows missing

Do not touch:

- RLS policies
- Workflow completion / follow-up policies (task-07)

## Business Behavior

Expected:

- «3D EVAPREMIUM Z RANTAMI» + «Przód + Tył» → slugs `front_3d`, `rear_3d`, `general` → notes loaded when rows exist for template + body_type
- «Klasyczne EVAPREMIUM BEZ RANTÓW» + «Przód + Tył + Bagażnik» → `front_classic`, `rear_classic`, `trunk` or `trunk_general` (body-dependent), `general`
- SUV/wagon/hatchback/sedan/liftback → `trunk`; other body types → `trunk_general` for trunk-inclusive variants
- «Niestandardowy» → `requiresCustomProductEscalation`, empty slugs, no notes load
- Unknown / missing set variant → `requiresSetVariantEscalation`
- Driver/passenger mat enum IDs (`1300`, `1310`) → set-variant escalation (manual review)

Forbidden:

- Returning notes for wrong product line (3D slugs when deal is classic)
- Silently skipping set variant — must escalate when variant cannot map
- Bitrix write or customer email as part of this task

Edge cases:

- Product string empty but enum present → enum fallback label (already in mapping config)
- Product string present → prefer string over enum (OD-004 string field authoritative)
- Multiple slugs; set-part rows missing → optional (no escalation)
- `general` (uwagi ogólne) → optional for escalation; **when a row exists** it must appear in the composed list for Przód/Tył/Bagażnik patterns (Human Architect 2026-06-23)
- Zero notes total → **requiresEscalation**
- `noteProductSlugs` omitted on `SelectNotesCommand` → legacy single `product` slug path preserved for tests

## Technical Requirements

Implementation:

- Pure functions in `bitrix-product-note-mapping.ts` for testability
- Parser calls mapping at boundary; no SDK in use cases
- `TemplateNotesService.resolveProductSlugs`: prefer `command.noteProductSlugs`, fallback `normalizeProduct(command.product)`

Architecture:

- Controller → use case → service → repository (unchanged)
- Bitrix payload → `parseBitrixDeal` → `DealContext` → persisted JSON → `SelectNotesCommand`

Model separation:

- DTO: Bitrix raw fields in `BitrixDealPayload`
- Command: `SelectNotesCommand` with `noteProductSlugs`
- Domain: `DealContext` extended fields
- Persistence: `deal_context_json` blob; `car_template_notes` rows
- Integration Payload: Bitrix enum IDs / labels in mapping config only
- LLM Output: none (task-05)

Boundary parsing:

- input source: Bitrix `crm.deal.get` fields
- parser/schema/mapper: `parseBitrixDeal` + `resolveBitrixNoteProductSlugs`
- trusted output type: `DealContext`
- failure mode: `insufficient_vehicle_data` unchanged; note mapping failures → escalation flags, not parse failure
- forbidden side effects before parse: no Supabase writes in parser

Providers:

- auth: none
- CRM/connectors: Bitrix read adapter (existing)
- telemetry: optional structured log on escalation flags at workflow start (task-05 may extend)
- feature flags: none
- LLM: none
- messaging: none
- payments: none

## State Changes

Allowed:

- `DealContext` JSON shape extension on workflow row (already nullable fields — backward compatible)

Forbidden:

- New workflow statuses
- CRM mutations

Side effects:

- None in this task (read-only Bitrix + Supabase)

## Testing

Required tests:

- unit: every set-variant ID in `BITRIX_SET_VARIANT_NOTE_TEMPLATES` materializes expected slugs for 3d and classic lines
- unit: custom product, missing variant, escalation IDs return correct flags
- unit: `parseBitrixDeal` populates `noteProductSlugs` for representative deal fixture (e.g. 33950)
- unit: `TemplateNotesService` merges notes across slugs without duplicate IDs
- regression: template match rates unchanged vs task-13 cached baseline
- forbidden behavior: no notes returned when `requiresCustomProductEscalation`
- edge case: trunk slug body-type split (`trunk` vs `trunk_general`)

Test format:

```text
Given: Bitrix product «3D EVAPREMIUM Z RANTAMI», set variant «Przód + Tył» (274), body SUV
When: resolveBitrixNoteProductSlugs runs
Then: noteProductSlugs = [front_3d, rear_3d, general]
Forbidden side effect: CRM write
```

```text
Given: matched template with notes for front_3d and rear_3d but not general
When: TemplateNotesService.selectNotes with those slugs
Then: notes.length > 0, requiresEscalation false (partial rows allowed per current contract)
Forbidden side effect: workflow status change
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- API/network: `npx ts-node scripts/batch-stage-full-audit.ts --save scripts/.notes-audit-final.json`
- sandbox/mock integration: unit tests for mapping table
- structured log/audit event: not required in this task
- trace/request/workflow ID: benchmark JSON paths in Final Report

If NO, reason:

- N/A

## Acceptance Criteria

- [x] Iteration-0 notes baseline documented in task History (five-stage notes arithmetic mean **16.0%** from 2026-06-19 audit)
- [ ] Five-stage notes arithmetic mean **≥ 60.0%** on live `batch-stage-full-audit.ts` (or Human Architect floor via OD-014)
- [ ] Template arithmetic mean on same audit **≥ 90.0%** (no regression vs task-13)
- [x] Unit tests for `bitrix-product-note-mapping`, parser, `template-notes.service` PASS
- [x] `npm test` PASS; `npm run build` PASS; `harness-check` PASS
- [x] `DealContext` new fields round-trip through `postsale-workflow.mapper`
- [x] Escalation flags set for Niestandardowy, missing variant, driver/passenger mats
- [x] `SelectNotesUseCase` wired in `MatchWorkflowTemplateUseCase`
- [ ] Codex audit PASS (wrong notes affect downstream customer messaging)
- [x] No task-13 matching algorithm changes in this task (scope isolation)

## Validation Commands

```bash
bash ./scripts/harness-check
```

```bash
npm test
npm run lint
npm run build
```

Project-specific:

```bash
# Notes + template full audit (acceptance)
npx ts-node scripts/batch-stage-full-audit.ts --save scripts/.notes-audit-final.json

# Regression: template rates unchanged (task-13 baseline)
npx ts-node scripts/historical-match-accuracy-cached.ts scripts/.accuracy-iter-final.json
```

## Codex Review Contract

Codex must review task alignment, scope isolation from task-13, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, escalation correctness, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason:

- Wrong note selection propagates to Langflow classification and customer email (task-05)
- Bitrix field mapping extension affects parsed DealContext for all workflows

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- **OD-014** (proposed) — Five-stage notes arithmetic mean acceptance floor (recommended **≥ 60%**; baseline 16%). Human Architect may raise to 80%+ or accept pooled-only metric.
- **OD-013** — Missing `car_template_notes` rows for valid slugs; mapping alone cannot fix.

If none beyond above: see OD-014, OD-013.

## Linear Mapping

Linear project: Postsale Agent Evapremium V1  
Linear issue: TBD (proposed SEL-87)  
Linear status: Backlog (create when Implementation starts)

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md` (task-14 row)  
Related PR: TBD  
Related reviews: task-13 Review 2026-06-19 (scope split)  
Related QA evidence: `scripts/.full-audit-all-stages.json` (2026-06-19)  
Related decisions: OD-004 Bitrix field map; task-13 template match decisions

## History

2026-06-19 - Created - Task Designer: split from task-13 Review scope creep (Bitrix product/set-variant → note slugs)
2026-06-19 - Cancelled (superseded) - Human Architect briefly removed notes mapping; task re-opened 2026-06-23
2026-06-23 - Cancelled - Full template/notes persistence removal; implementation reverted; see `docs/decision-log.md`

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Notes arithmetic mean (5 stages):
Template arithmetic mean (5 stages, regression):
Regressions:
Risks:
OPEN_DECISIONs:
Codex Audit required: YES
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode: Review → Codex Audit → unblock task-05
```
