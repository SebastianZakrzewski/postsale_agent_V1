# Docs Maintenance Mode

Validate, repair, and maintain repository documentation as an accurate source of truth for agents and humans.

Entry map and hard stops: `AGENTS.md`. Runtime: Cursor Composer 2.5, or Codex only when explicitly assigned. Docs Maintenance is source-of-truth hygiene, not product design, implementation, approval, audit, or merge authority.

## Authority

May inspect docs, code, tests, diffs, ExecPlans, repo tasks, Linear links, PR/review state, check output, runtime evidence, `docs/QUALITY_SCORE.md`, and tech debt tracker.

May edit docs, indexes, links, task metadata, ExecPlans, `docs/QUALITY_SCORE.md`, and tech debt entries only to preserve source-of-truth accuracy.

Must not implement production code, change business behavior, invent decisions, create requirements from Linear alone, treat Linear/Obsidian as source of truth, close blocking `OPEN_DECISION`s, mark decisions `ACCEPTED` without Human Architect confirmation, approve work, audit own work, merge, hide unresolved conflicts, perform external side effects, or use production credentials/data.

## Purpose

Keep the repository knowledge base accurate, linked, structured, fresh, and useful for future agent runs; prevent stale, missing, contradictory, or misleading context.

## Read Before Work

Always load: `AGENTS.md`, `docs/agents/runtime-strategy.md`, this file, `ARCHITECTURE.md`, `docs/QUALITY_SCORE.md`, `docs/decision-log.md`, `docs/open-decisions.md`, `docs/product-specs/`, `docs/design-docs/`, `docs/exec-plans/active/`, `docs/exec-plans/completed/`, `docs/tasks/`, `docs/references/`, relevant `docs/generated/`, latest relevant code/tests for docs-code drift, and latest checks output if available.

For risky areas also load: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

If Linear was used, inspect it only for status, owner, priority, PR/review state, source links, and progress state. Follow `docs/agents/_shared/linear-policy.md`.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available: maintenance target or scan scope, repository docs to inspect, known `OPEN_DECISION` entries, current source-of-truth files, and current code/test references when checking docs-code drift.

If a source-of-truth conflict cannot be resolved from accepted repo decisions, stop and create/report `OPEN_DECISION`.

## Maintenance Scope

May check/update: broken links, missing index entries, stale docs, required sections, task metadata, ExecPlan status, task/PR/Linear/ExecPlan links, decision-log consistency, `OPEN_DECISION` status, Runtime Validation evidence references, Codex Audit requirements, `docs/QUALITY_SCORE.md`, tech debt tracker, generated reference freshness notes, and docs-code drift reports.

## Source Of Truth

Repository docs are source of truth only when accepted, current, and not contradicted by code/tests or accepted decisions. Use priority order:

1. Explicit Human Architect decision.
2. `docs/decision-log.md`.
3. Active repo task in `docs/tasks/`.
4. Active ExecPlan in `docs/exec-plans/active/`.
5. Accepted product/design docs.
6. `ARCHITECTURE.md`.
7. Code/tests behavior.

If docs conflict with code/tests and no accepted decision resolves it, report docs-code drift and create/report `OPEN_DECISION`; do not silently choose one side.

## Docs Checks

Verify required docs exist; index files link to relevant docs; doc status is clear; product specs distinguish `Draft` from `Approved` and match accepted decisions only when approved; draft product specs are not treated as accepted business rules; design docs do not present rejected/deferred ideas as accepted; `decision-log.md` contains confirmed decisions only; `open-decisions.md` contains unresolved decisions with status; stale/deprecated docs are marked; generated references are marked generated with freshness notes; docs/tasks/ExecPlans/Linear/PRs/decisions are validly linked.

Validate `.harness/stack.env` against active Technology Context in ExecPlans and repo tasks when stack-specific checks are required.

Report stack configuration drift when `.harness/stack.env` conflicts with active task or ExecPlan Technology Context.

## Task Checks

Validate all `docs/tasks/*.md` files against `docs/tasks/_template.md`.

For each relevant `docs/tasks/` task, verify every required field from `docs/tasks/_template.md`. Also verify: task links to ExecPlan if part of a larger initiative; Linear issue links back to repo task; risky tasks require Codex Audit; Runtime Validation `YES` includes required evidence; forbidden scope is explicit; acceptance criteria are testable; `OPEN_DECISION` blockers are listed.

## ExecPlan Checks

Validate all active and completed ExecPlans against:

- `docs/exec-plans/PLANS.md`
- `docs/exec-plans/PLAN_TEMPLATE.md`

Check that each ExecPlan includes every required section from `docs/exec-plans/PLANS.md` and `docs/exec-plans/PLAN_TEMPLATE.md`. Report missing sections, stale active plans, missing repo task links, missing Linear mapping, missing Technology Context, and validation/runtime evidence drift.

Also verify: active plans have owner/status; completed plans are moved to `docs/exec-plans/completed/`; stale active plans are flagged; plan links to repo tasks and Linear Project if used; execution decisions are reflected in `docs/decision-log.md` or `docs/open-decisions.md`; validation status matches implementation/review/QA reports.

## Docs-Code Drift

When checking drift, verify documented behavior matches tests/code; architecture matches import/dependency structure; statuses/enums/contracts exist in code; side effects match implementation; claimed runtime validation evidence exists; provider/integration behavior matches adapters/providers; AI behavior matches parsers, schemas, prompts, or structured outputs.

If drift is factual and low-risk, update docs. If drift implies business or architecture decision, create/report `OPEN_DECISION`.

## QUALITY_SCORE

Update `docs/QUALITY_SCORE.md` when maintenance changes or discovers quality status. Track docs freshness, task completeness, ExecPlan freshness, decision consistency, runtime evidence completeness, Codex Audit coverage, architecture docs consistency, risk level, and recommended next maintenance action.

If `docs/QUALITY_SCORE.md` does not exist, recommend creating it.

## Tech Debt

Update `docs/exec-plans/tech-debt-tracker.md` for issues that should not be fixed in the current run. Each entry includes:

```text
ID:
Domain:
Issue:
Impact:
Recommended fix:
Risk:
Owner:
Status:
Source:
```

Do not hide unresolved maintenance issues only in chat or Linear.

## Linear Update

If maintenance is linked to Linear, update Linear after repository state is updated. Linear tracks status only; repository docs remain source of truth. Follow `docs/agents/_shared/linear-policy.md`.

## Checks

Run relevant docs checks after changes using `docs/agents/_shared/validation-commands.md`. Use project-specific checks when available. If checks cannot run, report why and mark result as not fully verified.

## Stop When

Stop when docs/code conflict requires business decision; accepted decision is missing; required source-of-truth file is missing; maintenance would change behavior or require architecture redesign; blocking `OPEN_DECISION` exists; production data/credentials are needed; checks cannot run and verification is required; Linear/Obsidian context cannot be promoted safely into repo docs.

## Verdicts

Use exactly one:

```text
DOCS_MAINTENANCE_COMPLETE_PENDING_REVIEW
REQUEST_CHANGES
BLOCKED_BY_MISSING_CONTEXT
BLOCKED_BY_DOCS_CODE_DRIFT
BLOCKED_BY_OPEN_DECISION
BLOCKED_BY_SOURCE_OF_TRUTH_CONFLICT
BLOCKED_BY_MISSING_CHECKS
```

## Required Output

Every Docs Maintenance run ends with:

```text
Verdict:
Summary:
Maintenance target:
Docs inspected:
Docs updated:
Broken links fixed:
Task issues found:
ExecPlan issues found:
Docs-code drift:
QUALITY_SCORE update:
Tech debt recorded:
Checks run:
Linear update:
Risks:
OPEN_DECISIONs:
PR/Diff:
Next recommended mode:
```

If completed: `Verdict: DOCS_MAINTENANCE_COMPLETE_PENDING_REVIEW`; `Next recommended mode: Review`.

If fixes are needed: `Verdict: REQUEST_CHANGES`; `Next recommended mode: Fix`.

If blocked: `Verdict: BLOCKED_BY_[REASON]`; `Next recommended step: Resolve blocker before continuing`.
