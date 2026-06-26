# Task: Agent Effectiveness Improvements (P0–P2)

Status: Done  
Stage: Domain | Persistence | Integration | Observability | QA  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-26  
Last updated: 2026-06-26

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Benchmark: `scripts/.benchmark-50-models-reply-simulation.json` (seed=42, 2026-06-26)  
PR: TBD  
Depends on: task-05 (requirements), task-06 (analyze reply), task-07 (follow-up)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/decision-log.md`, `docs/open-decisions.md`.

## Context

Why this task exists:

- Business: E2E benchmark (50 models) shows safe edge-case handling (48/48) but low first-reply COMPLETE rate (18/48) and mapping drift (28/48). Production effectiveness can improve without weakening completion safety.
- Technical: `question_text` from classify is discarded; analyze receives only `source_note`; PHOTO_REQUIRED depends on ingest attachments; initial email discourages numbered replies; note segmentation misses some compound patterns.
- Current behavior: Working safe pipeline; Langflow prompts partially aligned; no effectiveness telemetry; AMBIGUOUS template match escalates without early Bitrix signal.
- Target behavior: Persist customer-facing questions; pass them through email + analyze flows; strengthen Langflow specs; improve segmentation; observability for production iteration; optional OPTION_SELECTION heuristic behind env flag; Bitrix comment on AMBIGUOUS; regression fixtures + SILENCE follow-up test.

## Technology Context

Application type: backend  
Framework/runtime: NestJS on Node.js  
Language: TypeScript  
Persistence: Supabase — new column `workflow_requirements.customer_question`  
Integrations: Langflow (spec updates), Bitrix (comment on AMBIGUOUS), n8n ingest (attachment observability)  
Testing: Jest unit + integration; benchmark script unchanged except mapping helper alignment

## Goal

Expected result:

- P0: `customer_question` persisted and passed to draft-initial, draft-followup, analyze-reply Langflow payloads; initial email spec encourages numbered replies; follow-up PHOTO clarity; note segmentation extended; ingest emits observability when PHOTO workflow receives zero attachments.
- P1: analyze + follow-up Langflow specs extended (multi-paragraph mapping, PHOTO+variant); effectiveness metrics in workflow event payloads; integration test for analyze with attachments; SILENCE follow-up unit coverage extended.
- P2: `FEATURE_OPTION_SELECTION_HEURISTIC` env flag + post-Langflow heuristic; Bitrix comment on AMBIGUOUS template match at startup; Langflow analyze regression fixtures in repo.

Complete when:

- All acceptance criteria pass
- `npm test` and `harness-check` PASS
- Langflow specs updated in repo (deploy separately)

## Scope

Allowed changes:

- Migration `workflow_requirements.customer_question`
- `CreateRequirementsUseCase`, `AnalyzeReplyUseCase`, `SendInitialEmailUseCase`, `SendFollowupUseCase`, `IngestReplyUseCase`, `StartWorkflowUseCase`
- `NoteSegmentationService`, `OptionSelectionReplyHeuristicService`, `BitrixTemplateMatchCommentBuilder`, `NotifyTemplateMatchEscalationUseCase`
- Langflow spec txt files under `src/integrations/langflow/specs/`
- `.env.example`, unit/integration tests, `scripts/fixtures/` for regression samples
- Benchmark mapping evaluation alignment (use segmented note count)

Likely files/areas:

- `supabase/migrations/20260626140000_task16_customer_question.sql`
- `src/domains/requirements/services/*`
- `src/domains/bitrix/services/bitrix-template-match-comment.builder.ts`
- `src/lib/config/agent-effectiveness.config.ts`
- `scripts/run-benchmark-50-models-reply-simulation.ts`

## Forbidden Scope

- Changing completion/followup policy outcomes (PASS/INCOMPLETE/DENY rules)
- Poluzowanie PHOTO VALID without EMAIL_ATTACHMENT
- Poluzowanie OPTION_SELECTION VALID without explicit option (except behind `FEATURE_OPTION_SELECTION_HEURISTIC=true`)
- Direct Supabase PROD data fixes (Doblo, AMBIGUOUS templates) — document only
- n8n workflow changes in this repo (observability + docs only)

## Business Behavior

Expected:

- Customer sees numbered questions in initial email; may answer with matching numbers.
- Analyze uses `customerQuestion` when present for semantic mapping.
- PHOTO replies without attachments log `photo_reply_without_attachments` event; follow-up asks for email attachment explicitly.
- AMBIGUOUS template match adds Bitrix deal comment before customer email.

Forbidden:

- COMPLETE with incomplete requirements
- VALID without evidence
- Customer email send on AMBIGUOUS / NOT_FOUND match

## Technical Requirements

Implementation:

- Persist `customer_question` from classify `questionText` in `CreateRequirementsUseCase`
- Map requirement fields for Langflow via `requirement-langflow.mapper.ts` (`customerQuestion`)
- Extend `NoteSegmentationService` with `splitByQuestionThenProszeSprawdz`
- Optional `OptionSelectionReplyHeuristicService` gated by `FEATURE_OPTION_SELECTION_HEURISTIC`
- `NotifyTemplateMatchEscalationUseCase` + Bitrix comment on AMBIGUOUS/NOT_FOUND template match
- Effectiveness metrics payload in `REPLY_ANALYSIS_ACCEPTED` audit event

Architecture:

- Controller → use case → service → repository (unchanged)
- Langflow specs are repo source; runtime deploy is separate ops step

Model separation:

- DTO: Langflow analyze/draft payloads
- Command: `NotifyTemplateMatchEscalationCommand`
- Domain: `WorkflowRequirement` with `customer_question`
- Persistence: new nullable column on `workflow_requirements`
- Integration Payload: Langflow spec txt files
- LLM Output: parsed via existing Langflow parsers (no policy change)

Boundary parsing:

- input source: classify notes + customer reply + attachments
- parser: existing Langflow parsers + new heuristic post-processor
- trusted output type: requirement status + proposed next action
- failure mode: escalation unchanged; observability flags only
- forbidden side effects before parse: no customer email on AMBIGUOUS match

Providers:

- auth: none
- CRM/connectors: Bitrix comment on template-match escalation
- telemetry: `photoReplyWithoutAttachments`, effectiveness metrics in audit
- feature flags: `FEATURE_OPTION_SELECTION_HEURISTIC`
- LLM: Langflow flows (spec updates in repo)
- messaging: initial/follow-up email drafts (payload enrichment only)
- payments: none

## State Changes

Allowed:

- `workflow_requirements.customer_question` nullable TEXT (migration)
- Audit event payloads extended with effectiveness metrics
- Bitrix deal comment on AMBIGUOUS/NOT_FOUND template match at workflow start

Forbidden:

- Workflow status policy changes (completion/follow-up)
- PHOTO VALID without attachment evidence (unless existing policy allows)
- OPTION_SELECTION VALID without explicit option (except env-flag heuristic)

Side effects:

- Bitrix comment on template-match escalation (new, gated by match status)
- No change to customer email gating on AMBIGUOUS/NOT_FOUND

## Testing

Required tests:

- unit: note segmentation new patterns; option-selection heuristic; bitrix template comment builder; create-requirements persists `customer_question`; analyze passes `customerQuestion` to Langflow
- integration: analyze reply with attachment → VALID PHOTO; process-followup-check SILENCE path
- regression: fixture-based analyze parser samples

Validation:

```bash
bash ./scripts/harness-check
npm test
```

## Runtime Validation

Runtime Validation: NO (benchmark re-run optional post-merge)

## Acceptance Criteria

- [x] Migration adds `customer_question` nullable TEXT
- [x] All existing tests pass; new tests cover P0–P2 behaviors (217 tests)
- [x] Langflow specs updated in repo (deploy to Langflow instance separately)
- [x] `.env.example` documents `FEATURE_OPTION_SELECTION_HEURISTIC`

## Validation Commands

```bash
bash ./scripts/harness-check
```

```bash
npm test
npm run build
```

Project-specific (optional post-deploy):

```bash
npx ts-node scripts/run-benchmark-50-models-reply-simulation.ts
```

## Codex Review Contract

Codex must review: customer messaging payload changes, Langflow spec alignment, PHOTO evidence rules unchanged, OPTION_SELECTION heuristic gating, Bitrix escalation comment scope, migration safety, and no completion-policy regression.

Codex Audit required: YES  
Reason:

- Langflow payload and prompt changes affect customer reply classification
- Bitrix write on template-match escalation
- Optional heuristic can change requirement VALID outcomes

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- Supabase template data fixes (Doblo, AMBIGUOUS rows) — out of scope; document in ops
- Langflow instance deploy of updated specs — separate from repo merge
- Re-run 50-model benchmark post-migration — optional acceptance evidence

## Linear Mapping

Linear project: Postsale Agent Evapremium V1  
Linear issue: TBD  
Linear status: Backlog

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related QA evidence: `scripts/.benchmark-50-models-reply-simulation.json` (seed=42, 2026-06-26)  
Related tasks: task-05, task-06, task-07

## History

2026-06-26 - Created - Task Designer: P0–P2 effectiveness improvements from 50-model benchmark  
2026-06-26 - In Progress - Implementation: migration, Langflow payloads/specs, segmentation, heuristic, Bitrix escalation, tests  
2026-06-26 - Done - Implementation: 217 tests PASS; harness-check PASS; Langflow deploy pending ops

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Benchmark delta (optional):
Risks:
OPEN_DECISIONs:
Codex Audit required: YES
Next recommended mode: Review → Codex Audit → deploy Langflow specs + migration
```
