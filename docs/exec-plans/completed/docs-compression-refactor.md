ExecPlan: Docs Compression Refactor

Status: Completed
Owner: Docs Maintenance agent
Risk level: Low
Created: 2026-06-09
Last updated: 2026-06-19

## Purpose

Compress and deduplicate repository documentation without changing product behavior, runtime behavior, architecture decisions, or validation contracts.

Business goal: keep the SellGenius harness readable and safe for future agent runs.
Success criteria: repeated documentation policy is replaced by canonical links where safe, required docs remain present, and harness checks pass after each batch.
Must-never-happen: remove required source-of-truth content, change business rules, close `OPEN_DECISION`s without Human Architect approval, or weaken validation requirements.

## Context

This is a harness-only documentation maintenance initiative. It exists to reduce repeated agent policy text while preserving the repository source-of-truth model.

Required source-of-truth docs:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/agents/runtime-strategy.md`
- `docs/agents/modes/docs-maintenance.md`
- `docs/exec-plans/PLANS.md`
- `docs/exec-plans/PLAN_TEMPLATE.md`
- `docs/product-specs/PRODUCT_SPECS.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- `docs/QUALITY_SCORE.md`

Relevant code areas:

- `scripts/docs-check`
- `scripts/architecture-check`
- `scripts/plans-check`
- `scripts/tasks-check`
- `scripts/harness-check`
- `.harness/stack.env`

Relevant Linear project/issues:

- None.

## Technology Context

Application type:

- Documentation harness.

Framework/runtime:

- None.

Language:

- Markdown and bash validation scripts.

Persistence:

- None.

Integrations:

- None.

Testing/runtime validation tools:

- `bash ./scripts/docs-check`
- `bash ./scripts/architecture-check`
- `bash ./scripts/plans-check`
- `bash ./scripts/tasks-check`
- `bash ./scripts/harness-check`

Deployment target:

- Repository documentation only.

Technology assumptions:

- `.harness/stack.env` remains `harness-only` and `documentation`.
- No Node, Python, Playwright, lint, typecheck, test, or build checks are required for this docs-only initiative.

Technology OPEN_DECISIONs:

- None.

## Mode / Risk Level

Mode depth: STANDARD
Codex Audit required: NO
Runtime Validation required: NO

## Readiness Gates

This is a harness-only documentation-only ExecPlan. Product spec gates are intentionally omitted under `docs/exec-plans/PLANS.md`.

Current status:

- `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC`: NOT APPLICABLE
- `BUSINESS_PROCESS_MAPPING_DRAFT`: NOT APPLICABLE
- `BUSINESS_PROCESS_MAPPING_READY`: NOT APPLICABLE
- `ARCH_READY_FOR_TASK_DESIGNER`: NOT APPLICABLE
- `ARCH_READY_FOR_IMPLEMENTATION`: NOT APPLICABLE

Linked product spec:

- path: `none (harness-only / documentation-only)`
- status: missing

Implementation status:

- READY FOR IMPLEMENTATION

Risk classification:

- CRM writes: NO
- customer messaging: NO
- pricing/payments: NO
- auth/security: NO
- database migrations: NO
- state changes: NO
- external integrations: NO
- production data/automation: NO
- LLM business behavior: NO
- architecture boundaries: NO

## Source Of Truth

This ExecPlan is the planning source of truth for this documentation maintenance initiative. Implementation truth remains in repository docs, accepted decisions in `docs/decision-log.md`, architecture rules in `ARCHITECTURE.md`, and validation behavior in `scripts/`.

## V1 Scope

V1 includes:

* Create the active docs-only ExecPlan and required ExecPlan directory structure.
* Normalize validation command documentation to bash harness scripts.
* Add shared agent policy fragments for repeated validation, risk, Linear, and runtime evidence policy.
* Replace repeated mode boilerplate with links while preserving mode-specific contracts.
* Reduce safe duplication between Review and Codex Audit docs.
* Reduce safe duplication between Architect Mode and `ARCHITECTURE.md`.
* Replace duplicated task and plan field lists with references to canonical templates where safe.
* Compress `docs/QUALITY_SCORE.md` by linking to canonical guardrail docs.
* Run validation after every small batch.

V1 excludes:

* Runtime code changes.
* Product behavior changes.
* Architecture redesign.
* Stack changes.
* Closing `OPEN_DECISION`s.
* Creating implementation tasks for product work.

V1 must not include deferred V2/V3 work unless required for safety, core business value, or compliance.

## Deferred V2/V3

V2 candidates:

* Add stronger mechanical checks for shared documentation links.
* Add link checking if the harness later supports it.

V3 candidates:

* Generate docs metrics for repetition and stale sections.

Deferred work must not be implemented in V1 tasks unless Human Architect updates the plan.

## Architecture Summary

This plan does not change runtime architecture.

Domains:

- Documentation harness.

Default domain layers:

```text
types/schemas
-> config
-> repository/ports
-> services
-> use-cases
-> runtime/adapters
-> API/UI
```

Providers:

- auth: unchanged
- CRM/connectors: unchanged
- telemetry: unchanged
- feature flags: unchanged
- LLM: unchanged
- messaging: unchanged
- payments: unchanged

Forbidden dependency edges:

- No runtime dependency edges are changed by this docs-only work.

Boundary parsing requirements:

- Not applicable to documentation-only maintenance.

## Repo Task List

No separate repo task files are required for this docs-only maintenance run.

- docs-compression-refactor - compress documentation policy repetition - status: completed (2026-06-19; archived to `completed/`)

## Dependencies

Documentation dependencies:

* Existing source-of-truth docs must remain authoritative.
* Required headings in templates and mode docs must remain detectable by harness scripts.

Technical dependencies:

* Bash must be available to run validation scripts.

Business dependencies:

* None.

External dependencies:

* None.

Blocking dependencies:

* None.

## Progress

- [done] preflight-execplan - active docs-only ExecPlan created and required ExecPlan directory structure restored.
- [done] normalize-validation - command documentation normalized to bash harness scripts.
- [done] create-shared-docs - shared policy fragments added.
- [done] compress-mode-docs - mode boilerplate compressed through shared policy links.
- [done] dedupe-review-codex - Review and Codex gates deduplicated through a shared checklist.
- [done] dedupe-architecture-architect - Architect Mode now links to `ARCHITECTURE.md` for repeated invariants.
- [done] compress-template-references - repeated task and ExecPlan field lists replaced with canonical template references where safe.
- [done] compress-quality-score - Quality Score category checks compressed through source-of-truth links.
- [done] final-validation-report - final checks passed and report prepared.

## Surprises & Discoveries

- Repository was harness-only before task-01 (2026-06-17); NestJS stack activated via `.harness/stack.env` nestjs profile.
- Prior active ExecPlan archived to `docs/exec-plans/completed/` when V1 ExecPlan became active.
- `docs/exec-plans/active/` and `docs/exec-plans/completed/` were missing before this run.
- Shared agent policy docs now centralize validation commands, risk policy, Linear source-of-truth policy, runtime evidence, and shared review gates.
- The Architect Mode readiness ladder remains more detailed than the abbreviated ladder in ExecPlan standards/templates; it was not changed in this maintenance run to avoid changing gate semantics.

## Decision Log

Record accepted decisions made during this plan.

```text
YYYY-MM-DD — Decision — Rationale — Owner
```

Accepted decisions:

* None.

Do not record unresolved decisions here. Use `OPEN_DECISIONs`.

Accepted decisions must also be reflected in `docs/decision-log.md`.

## OPEN_DECISIONs

Blocking:

* None.

Non-blocking:

* None.

If none:

```text
None.
```

Blocking `OPEN_DECISIONs` must be resolved by Human Architect before implementation.

Each blocking decision must also appear in `docs/open-decisions.md`.

## Validation

Required checks:

```bash
bash ./scripts/docs-check
bash ./scripts/architecture-check
bash ./scripts/plans-check
bash ./scripts/tasks-check
bash ./scripts/harness-check
```

Additional checks:

```bash
bash ./scripts/stack-check
```

Acceptance validation:

- Harness checks pass after each documentation batch.
- Required source-of-truth files and headings remain present.
- Documentation references canonical policies instead of repeating them where safe.

Forbidden behavior validation:

- No runtime files changed.
- No product behavior, architecture decisions, stack flags, or `OPEN_DECISION` status changed.

Regression validation:

- `bash ./scripts/harness-check` remains green at the end of every batch.

## Runtime Evidence

Runtime Validation is not required for this docs-only maintenance run.

Evidence to collect:

- Playwright test: not required
- Chrome DevTools MCP check: not required
- screenshot / DOM snapshot: not required
- API check: not required
- network check: not required
- no-console-error check: not required
- sandbox/mock integration check: not required
- structured log/audit event: not required
- trace/request/workflow ID: not required
- idempotency evidence: not required

## Linear Mapping

Linear Project:

- name: none
- link: none
- owner: none
- priority: none
- status: none

Linear Issues:

- None.

## Risks

Known risks:

- Over-compressing mode docs could weaken agent contracts.
- Readiness-gate wording may drift across Architect and ExecPlan docs.
- Validation docs previously mixed npm-style commands with bash scripts.

Mitigations:

- Keep verdict and Required Output contracts intact.
- Prefer links to canonical docs over deletion of normative content.
- Run harness validation after each small batch.

Residual risk after V1:

- The harness does not mechanically validate every cross-document link.

## Outcomes & Retrospective

Fill when the plan is completed or closed.

What shipped:

- Active docs-only ExecPlan for this maintenance run.
- Required `docs/exec-plans/active/` and `docs/exec-plans/completed/` structure.
- Shared agent policy docs under `docs/agents/_shared/`.
- Normalized bash validation commands across source-of-truth docs and templates.
- Compressed mode docs, Review/Codex gates, Architect/Architecture overlap, template references, and Quality Score checklists.

What was deferred:

- No runtime, product, stack, integration, or business-behavior work was attempted.
- Further alignment of readiness-gate wording between Architect Mode and ExecPlan standards remains a future docs maintenance candidate.

What changed from original plan:

- The plan file outside the repository was not edited.
- Compression favored link-based deduplication over aggressive deletion of source-of-truth contracts.

Validation result:

- Targeted checks and full harness passed after each batch.
- Final `bash ./scripts/docs-check`, `bash ./scripts/architecture-check`, `bash ./scripts/plans-check`, `bash ./scripts/tasks-check`, and `bash ./scripts/harness-check` passed.

Codex Audit result:

- Not required.

QA result:

- Not required.

Lessons learned:

- For this harness-only repository, bash scripts are the executable validation source of truth.
- Shared policy fragments reduce repeated mode boilerplate without weakening mode-specific verdicts and Required Output contracts.

Follow-up tech debt:

- Consider a future docs maintenance pass to explicitly reconcile the detailed Architect readiness ladder with the shorter ExecPlan readiness ladder.
