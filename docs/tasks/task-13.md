# Task: Template Match Accuracy — 90% Stage Arithmetic Mean (Iterative Normalization + Persistence)

Status: Done  
Stage: Domain | Persistence | Integration | QA  
Mode: Implementation  
Owner: Implementation agent (after Human Architect closes blocking OPEN_DECISIONs)  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-19  
Last updated: 2026-06-23

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / TBD (SEL-86 proposed)  
PR: TBD  
Depends on: task-03 (matching), task-04 (workflow match path), task-11 (EVAMATS PROD data)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-process-map.md`, `docs/decision-log.md`, `docs/open-decisions.md`, `docs/tasks/task-03.md`, `docs/tasks/task-11.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: ~20–30% deals on audited Bitrix stages fail template match → workflow escalates to manual review instead of automated postsale. Target: **arithmetic mean hit rate ≥ 90%** across five audited pipeline stages.
- Technical: Historical audits (Bitrix webhook + Supabase `car_templates`) show failures split into **AMBIGUOUS** (duplicate import rows, ~70 key groups / 76 removable rows) and **NOT_FOUND** (missing EVAMATS row, near-miss key, or import slug corruption). Prior ad-hoc matcher improvements (generation overlap, body cascade, model prefix) raised EXECUTING from 68.1% to 80.2% with zero regressions; further gains require coordinated **code normalization** + **persistence alignment**.
- Current behavior: `TemplateMatchingService` exact → generation overlap → model prefix → alias; `resolveUniqueTemplateMatch` returns AMBIGUOUS on 2+ rows; `car_templates` has no UNIQUE on match key; 2719 rows with known duplicates.
- Target behavior: Iterative improvements with **per-iteration benchmark gate**; final acceptance when five-stage arithmetic mean ≥ 90% and **no regression** on deals that were MATCHED in iteration-0 baseline.

## Baseline (2026-06-19, live Bitrix + Supabase PROD)

Audited stages (`CATEGORY_ID=0`):

| Label                 | `STATUS_ID`     | Matchable | MATCHED | NOT_FOUND | AMBIGUOUS |  Hit rate |
| --------------------- | --------------- | --------: | ------: | --------: | --------: | --------: |
| Czeka na opłatę       | `NEW`           |        11 |       7 |         3 |         1 |     63.6% |
| Opłacone              | `PREPARATION`   |        14 |      13 |         0 |         1 |     92.9% |
| Deale do dodania      | `UC_ZQ68O2`     |        22 |      17 |         4 |         1 |     77.3% |
| Wysłane do Realizacji | `EXECUTING`     |        91 |      73 |         8 |        10 |     80.2% |
| Faktura końcowa       | `FINAL_INVOICE` |       173 |     121 |        26 |        26 |     69.9% |
| **Pooled**            | —               |   **311** | **231** |    **41** |    **39** | **74.3%** |

**Arithmetic mean (five stages):** (63.6 + 92.9 + 77.3 + 80.2 + 69.9) / 5 = **76.8%**  
**Acceptance target:** arithmetic mean **≥ 90.0%** (equivalent to sum of stage rates ≥ 450%).

Per-stage floor (recommended, simplifies verification):

| Stage           | Min MATCHED |        Min hit rate |
| --------------- | ----------: | ------------------: |
| `NEW`           |          10 |               90.9% |
| `PREPARATION`   |          13 | 92.9% (already met) |
| `UC_ZQ68O2`     |          20 |               90.9% |
| `EXECUTING`     |          82 |               90.1% |
| `FINAL_INVOICE` |         156 |               90.2% |

**Gap to close:** +49 pooled matches (231 → 280) if using weighted view; arithmetic mean requires +66.1 percentage-points distributed across stages (largest gap on `FINAL_INVOICE`: +35 matches).

Benchmark tooling (existing / to extend):

- `scripts/batch-stage-match-audit.ts [STATUS_ID]`
- `scripts/historical-match-accuracy.ts [cohort]`
- `scripts/historical-match-accuracy-cached.ts [baseline.json]` (regression without Bitrix)
- New: `scripts/benchmark-all-stage-cohorts.ts` — runs five stages, prints arithmetic mean + pooled rate + JSON artifact

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase `postsale_agent_evapremium.car_templates`, `car_template_notes` (read + controlled DML dedup/aliases); optional migration UNIQUE constraint

Integrations:

- Bitrix24 read (benchmark only; no CRM writes in this task)

Testing/runtime validation tools:

- Jest unit tests for normalization + resolution
- Stage cohort benchmark scripts (live Bitrix + Supabase for acceptance; cached JSON for iteration regression)

Deployment target:

- OD-002 (non-blocking)

Technology assumptions:

- task-11 PROD data loaded (2719 templates)
- Matcher improvements from prior session may exist uncommitted — iteration-0 must snapshot baseline before further edits

Technology OPEN_DECISIONs:

- OD-011 — **resolved** 2026-06-19 (Option 3): duplicate resolution policy — see `docs/decision-log.md`
- OD-012 — **resolved** 2026-06-19: cross-variant alias policy — see `docs/decision-log.md`
- OD-013 (non-blocking): EVAMATS row supplementation ownership

## Goal

Expected result:

- Arithmetic mean hit rate across five audited stages **≥ 90.0%**
- Pooled hit rate **≥ 90.0%** (311 → ≥ 280 MATCHED) as secondary check
- **Zero regressions:** every deal MATCHED in iteration-0 baseline remains MATCHED after each iteration
- Persistence and CRM normalization remain aligned: keys used at match time resolve to rows in `car_templates` (or approved aliases)

Complete when:

- All acceptance criteria pass
- Benchmark JSON artifacts committed under `scripts/.accuracy-baseline-*.json` (sanitized: deal IDs + vehicle fields + status only; no secrets)
- `docs/open-decisions.md` blocking items closed or explicitly waived by Human Architect in decision-log

## Scope

Allowed changes:

### Code (normalization + matching)

- `src/domains/template-import/services/template-normalization.service.ts` — CRM-only normalization extensions (not EVAMATS import path unless OD-012 says otherwise)
- `src/domains/template-import/config/evamats-slug-mappings.ts` — CRM body/brand token maps only
- `src/domains/template-import/utils/generation-range.util.ts`
- `src/domains/template-matching/services/template-matching.service.ts`
- `src/domains/template-matching/utils/template-match-resolution.util.ts`
- `src/integrations/supabase/supabase-car-template.repository.ts` (read queries only unless persistence iteration approved)
- Unit tests: `template-normalization.service.spec.ts`, `template-matching.service.spec.ts`, `template-match-resolution.util.spec.ts`

### Persistence (iteration 3+)

- One-time DML script: `scripts/dedup-car-templates.sql` (merge notes → survivor, delete duplicate rows)
- One-time DML script: `scripts/patch-car-template-aliases.sql` (near-miss keys from audit)
- One-time data fix script: `scripts/fix-car-template-slug-corruption.sql` (e.g. `c5_aircrseater` → `c5_aircross`, `crseaterover` → `crossover`)
- Optional migration: `supabase/migrations/*_car_templates_unique_match_key.sql` — UNIQUE `(brand, model, body_type, generation)` after dedup
- Import guard: `scripts/run-evamats-import-standalone.ts` — upsert / skip duplicate key (prevent re-import duplicates)

### Benchmark / QA scripts

- `scripts/benchmark-all-stage-cohorts.ts`
- Extend `scripts/historical-match-accuracy.ts` cohort map for five `STATUS_ID`s
- Baseline JSON artifacts in `scripts/` (gitignored secrets; deal metadata only)

Likely files/areas:

- See above; do not touch postsale workflow orchestration beyond match path tests

## Forbidden Scope

Do not change:

- Product spec escalation rule: wrong template worse than NOT_FOUND — no fuzzy / probabilistic matching
- `StartWorkflowUseCase` orchestration semantics (task-04 / task-12)
- Bitrix stage writes, customer email, Langflow, n8n (task-05–08)
- `car_template_notes` selection rules in `TemplateNotesService` — **moved to task-14** (`docs/tasks/task-14.md`)

Do not implement:

- LLM-based matching
- Automatic pick among **non-identical** candidates (different generation/body semantics)
- Production CRM mutations
- Re-import full EVAMATS without Human Architect approval (large DML)

Do not touch:

- RLS policies
- Workflow completion / escalation policies (task-07)

## Business Behavior

Expected:

- Exactly one `car_templates` row (or approved alias) → `MATCHED` → workflow can proceed to requirements (task-05)
- Identical duplicate rows (same `brand|model|body_type|generation`) → single deterministic `MATCHED` per OD-011
- Near-miss CRM keys → `MATCHED` via `aliases` or approved normalization only when Human accepts same physical template (OD-012)
- Zero or non-identical multiple matches → still `NOT_FOUND` / `AMBIGUOUS` / escalate (unchanged product rule)

Forbidden:

- Forcing MATCHED to hit 90% when evidence shows different vehicles or missing EVAMATS content
- Silent change of EVAMATS import normalization for all future imports without documented decision

Edge cases:

- CRM brand typo (`Dogde` → `dodge`) — alias or brand map
- CRM model trim suffix (`pacifica_ru_2_gen_limited` → `pacifica_ru_2_gen`)
- Granular body in DB (`suv_5_door`) vs coarse CRM (`suv`) — existing cascade; persistence aliases must not break `SelectNotes` body filter
- Missing generation in CRM (`Touran II gen`, generation null) — only fix if OPEN_DECISION allows generation-optional match
- New models not in EVAMATS (e.g. Audi Q3 FJ 2025+) — remain NOT_FOUND unless row added (OD-013)

## Technical Requirements

Implementation — iterative plan (gate after each iteration):

```text
Iteration 0 — Baseline lock
  - Run benchmark-all-stage-cohorts; save JSON per stage + combined
  - Export list of MATCHED deal IDs for regression guard
  - Document NOT_FOUND / AMBIGUOUS root-cause tags (duplicate | missing_row | near_miss | slug_corruption | crm_gap)

Iteration 1 — Duplicate resolution (code)
  - resolveUniqueTemplateMatch: if all candidates share identical normalized match key → pick deterministic survivor (lowest id lexicographic)
  - Tests: identical duplicates → MATCHED; different generation overlap → still AMBIGUOUS
  - Re-benchmark; expect +30–40 AMBIGUOUS → MATCHED, ~85–87% arithmetic mean

Iteration 2 — CRM normalization extensions (code)
  - Brand alias map (CRM typo → canonical brand slug)
  - Model trim / marketing suffix stripping (e.g. `_limited`, `byd_` prefix on model)
  - Generation label fixes for CRM (`2020+` already handled; extend only with tests)
  - Optional: `normalizeCrmModelForMatch` candidate order tuning
  - Re-benchmark; target +5–10 NOT_FOUND near-miss fixes

Iteration 3 — Persistence dedup + constraint (DML + migration)
  - Execute dedup script: 70 groups, ~76 rows removed, notes merged to survivor
  - ADD UNIQUE uq_car_templates_match_key
  - Import script: conflict-safe insert
  - Re-benchmark; AMBIGUOUS from duplicates should stay resolved if iteration 1 code reverted

Iteration 4 — Persistence aliases + slug fixes (DML)
  - Patch aliases for audited near-miss list (see Baseline NOT_FOUND probes):
    - seal_u_1_gen → seal_u_dm-i_1_gen
    - byd_atto_2 / atto_2_1_gen
    - ami body fastback_2_door
    - fiesta hatchback ↔ hatchback_3_door (if OD-012 approved)
    - tiggo_8 suv ↔ suv_7_seater (if OD-012 approved)
    - pacifica_ru_2_gen_limited → pacifica_ru_2_gen
  - Fix corrupted model slugs in DB (aircross, crosstrek, crossover)
  - Re-benchmark

Iteration 5 — Missing EVAMATS rows (data, optional for 90%)
  - Human-provided rows or approved subset import for high-frequency NOT_FOUND on FINAL_INVOICE / EXECUTING
  - Only if iterations 1–4 do not reach 90% arithmetic mean
```

Architecture:

- CRM normalization stays in `TemplateNormalizationService` at match time
- EVAMATS import normalization unchanged unless Human approves shared fix for slug corruption at source
- Matcher remains: exact → overlap → prefix → alias (order may not change without test proof)

Model separation:

- DTO: benchmark script output JSON
- Command: `MatchTemplateCommand` unchanged
- Domain: `TemplateMatchResult`, `CarTemplate`
- Persistence: `CarTemplateRow`, DML scripts
- Integration Payload: Bitrix deal fields via existing mapping (OD-004)

Boundary parsing:

- input source: Bitrix `crm.deal.get` fields
- parser: `TemplateNormalizationService.normalizeCrmVehicleFields`
- trusted output: normalized slugs for repository query
- failure mode: NOT_FOUND / AMBIGUOUS → escalation (unchanged)
- forbidden side effects before parse: no Supabase writes during match

Providers:

- auth: unchanged
- CRM: Bitrix read only (benchmark)
- telemetry: benchmark stdout + optional workflow_events unchanged
- LLM / messaging / payments: none

## State Changes

Allowed:

- `car_templates`: DELETE duplicate rows; UPDATE `aliases`, `model`, `body_type` (corruption fixes); optional new INSERT rows (OD-013)
- `car_template_notes`: UPDATE `car_template_id` when merging duplicates
- New migration for UNIQUE index (after dedup)

Forbidden:

- `postsale_workflows` production backfill
- Bitrix deal field updates
- Destructive delete without note merge

Side effects:

- PROD DML on template tables only (task-11 class operation; requires Codex audit + Human approval)
- No customer-visible side effects

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: each normalization extension; duplicate tie-breaker; regression cases from baseline deals (sanitized fixtures)
- integration: `template-matching.module.spec.ts` with Supabase test client or in-memory repo
- regression: `historical-match-accuracy-cached.ts` against iteration-0 JSON — all prior MATCHED stay MATCHED
- forbidden behavior: non-identical duplicates remain AMBIGUOUS; fuzzy match not added
- edge case: BYD Atto 2, Sportage V, Mokka 4-dupe group, Subaru Crosstrek slug

Test format:

```text
Given: car_templates has two rows with identical brand|model|body_type|generation
When: MatchTemplateUseCase runs for that CRM key
Then: status MATCHED with deterministic carTemplateId
Forbidden side effect: second workflow row or CRM write
```

```text
Given: iteration-0 baseline deal 34272 was MATCHED
When: matcher runs after iteration N
Then: still MATCHED with same or equivalent car_template_id
Forbidden side effect: regression to NOT_FOUND
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- sandbox/mock integration: cached baseline regression (required each iteration)
- API/network: live `benchmark-all-stage-cohorts.ts` against Bitrix + Supabase (required for final acceptance)
- structured log/audit event: not required (no workflow start in this task)
- trace/request/workflow ID: benchmark JSON artifact paths in Final Report

If NO, reason:

- N/A

## Acceptance Criteria

- [ ] Iteration-0 baseline JSON committed or documented in task History with arithmetic mean **76.8%** recorded
- [ ] Five-stage benchmark arithmetic mean **≥ 90.0%** on live audit (2026-06-19 cohort definitions)
- [ ] Pooled hit rate **≥ 90.0%** (≥ 280/311 MATCHED)
- [ ] Each stage hit rate **≥ 90.0%** OR documented Human waiver for `PREPARATION`-only exceedance with compensating pooled check
- [ ] Zero regressions vs iteration-0 MATCHED set (cached regression script PASS)
- [ ] `npm test` PASS; harness-check PASS
- [ ] If persistence iteration executed: duplicate key groups = 0; UNIQUE constraint present
- [ ] Codex audit PASS (risky: PROD DML + matching behavior)
- [ ] No new blocking OPEN_DECISIONs introduced without Human entry

## Validation Commands

```bash
bash ./scripts/harness-check
```

```bash
npm test
```

Project-specific:

```bash
# Iteration 0 / final acceptance
npx ts-node scripts/benchmark-all-stage-cohorts.ts

# Per-stage
npx ts-node scripts/batch-stage-match-audit.ts NEW
npx ts-node scripts/batch-stage-match-audit.ts PREPARATION
npx ts-node scripts/batch-stage-match-audit.ts UC_ZQ68O2
npx ts-node scripts/batch-stage-match-audit.ts EXECUTING
npx ts-node scripts/batch-stage-match-audit.ts FINAL_INVOICE

# Regression without Bitrix
npx ts-node scripts/historical-match-accuracy-cached.ts scripts/.accuracy-baseline-all-stages.json
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason:

- PROD `car_templates` DML (dedup, aliases, slug fixes)
- Matching behavior change affects escalation volume and template correctness (customer-facing downstream)

## OPEN_DECISIONs

Blocking: None (resolved 2026-06-19).

Resolved:

- **OD-011** — Option 3 accepted: PROD dedup + tie-breaker in `resolveUniqueTemplateMatch`. See `docs/decision-log.md`.
- **OD-012** — Cross-variant alias policy accepted: trim/suffix aliases allowed; body-type aliases only when notes equivalent per product. See `docs/decision-log.md`.

Non-blocking:

- **OD-013** — Who supplies missing EVAMATS rows for true NOT_FOUND models (Captur 2 gen, Q3 FJ, Golf MK7, etc.) and whether partial import is in scope for V1.

## Linear Mapping

Linear project: Postsale Agent Evapremium V1  
Linear issue: TBD (proposed SEL-86)  
Linear status: Backlog (create when Implementation starts)

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md` (task-13 row)  
Related PR: TBD  
Related reviews: task-03, task-04, task-11; task-13 Review 2026-06-19 → scope split to **task-14**  
Related QA evidence: stage audits 2026-06-19 (NEW, PREPARATION, UC_ZQ68O2, EXECUTING, FINAL_INVOICE)  
Related decisions: OD-004 Bitrix field map; task-11 EVAMATS import

## History

2026-06-19 - Created - Task Designer: mapped 90% arithmetic-mean goal from multi-stage Bitrix audits; iterative code + persistence plan; baseline 76.8% / 311 deals  
2026-06-19 - Done - Implementation: iterations 1-4 complete; arithmetic mean **93.3%** (pooled **90.7%**); PROD dedup 76 rows + alias/slug fixes; 95 tests PASS
2026-06-19 - Resolved - Human Architect accepted OD-011 (Option 3) and OD-012 (recommended alias policy); synced to `docs/decision-log.md` and `docs/open-decisions.md`
2026-06-23 - Updated - Full template persistence removal; PROD tables dropped; task-14/15 cancelled; OD-015 blocks task-05

## Application code retirement (2026-06-23)

Historical PROD load and benchmark (2026-06-19) remain valid **as past evidence only**. In-app matcher/normalization **fully removed** — modules, repos, and Supabase template tables dropped. Accuracy claims apply to historical PROD state before DROP. Next step: Human Architect resolves **OD-015** for task-05 notes source.

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Arithmetic mean hit rate (5 stages):
Pooled hit rate:
Regressions:
Risks:
OPEN_DECISIONs:
Codex Audit required: YES
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode: Review → Codex Audit → Human Architect
```
