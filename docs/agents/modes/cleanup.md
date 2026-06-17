# Cleanup Mode

Detect and reduce AI slop, architecture drift, duplication, stale patterns, and low-risk technical debt without changing business behavior.

Entry map and hard stops: `AGENTS.md`. Runtime: Cursor Composer 2.5, or Codex when explicitly assigned. May inspect code, tests, docs, diffs, checks, task history, ExecPlans, Linear links, PR state, and `QUALITY_SCORE.md`. May edit code, tests, docs, task metadata, or quality files only when cleanup directly requires it and behavior is preserved.

Must not add features, change business behavior or product scope, resolve blocking `OPEN_DECISION`s, implement Linear-only requirements, perform external side effects, or approve/merge its own work.

## Purpose

Small maintenance passes that keep the repo readable, consistent, and agent-friendly. Cleanup Mode is repository garbage collection: reduce drift before weak patterns become system-wide AI slop.

## Read Before Work

Always load: `AGENTS.md`; `docs/agents/runtime-strategy.md`; this file; `ARCHITECTURE.md`; `docs/QUALITY_SCORE.md`; `docs/exec-plans/tech-debt-tracker.md` if present; `docs/decision-log.md`; `docs/open-decisions.md`; relevant product specs/design docs; relevant code/tests; latest checks output if available.

For risky areas per `AGENTS.md`, also load `docs/SECURITY.md`, `docs/RELIABILITY.md`, and `docs/OBSERVABILITY.md`.

If Linear was used, inspect Linear only for status, owner, priority, PR/review state, and source links.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available: cleanup target or scan scope; relevant source files/docs; known `OPEN_DECISION` entries; current quality or tech-debt context; explicit confirmation that cleanup must preserve behavior.

If cleanup would require behavior change, stop and create/report a follow-up task or `OPEN_DECISION`.

## Cleanup Targets

May address behavior-preserving fixes for: duplicate helpers; inconsistent naming for one concept; YOLO parsing; raw provider/LLM payload leaks; scattered validation; oversized files; unnecessary abstractions; dead code; stale docs; weak test structure; missing task/PR/Linear/ExecPlan links; missing architecture references; outdated `QUALITY_SCORE.md`; low-risk refactors.

Prefer shared utilities, one concept = one name, boundary parsing before business execution, Providers over direct SDK imports, small files, clear domain/use-case boundaries, structured logs/audit events for important behavior, and repo source of truth over Linear/Obsidian-only context.

Avoid raw payloads or LLM outputs as domain/persistence models; business logic in UI/controllers/repositories/adapters/n8n-only workflows; side effects before validation; weak boundaries; unjustified `any`; speculative abstractions; silent architecture exceptions; cleanup mixed with feature work.

Minor findings may become tech debt. Serious findings should block cleanup or route to Architect, Task Designer, or Fix Mode.

## Architecture And Behavior

Verify dependencies follow `ARCHITECTURE.md`: UI/API use use cases; use cases avoid direct SDK imports; cross-cutting concerns enter through Providers; repositories avoid business decisions; adapters avoid lifecycle/status decisions; n8n-only workflows do not hold critical validation, idempotency, or state transitions; model separation is preserved.

Before editing, identify unchanged behavior, protecting tests, required checks, in-scope files, and forbidden files. Prefer regression or characterization tests when behavior is not already covered. If an architecture exception is needed, create/report `OPEN_DECISION`.

## Allowed And Forbidden Work

May remove dead code, centralize duplicated helpers, safely rename for consistency, split oversized files, replace local helpers with shared utilities, improve type boundaries, add regression/characterization tests, update stale links, update `QUALITY_SCORE.md`, update `docs/exec-plans/tech-debt-tracker.md`, or update cleanup PR metadata.

Must not add features, change public contracts or DB schema unless explicitly scoped, introduce business rules, create undocumented statuses/enums/contracts, use production credentials/data, send customer messages, resolve blocking `OPEN_DECISION`s, approve, audit, or merge its own cleanup.

## Tests And Checks

Run checks relevant to cleanup using `docs/agents/_shared/validation-commands.md`. Run affected tests for test changes, architecture checks for boundary changes, and docs/task checks for link or metadata changes. If checks cannot run, report why and mark result as not fully verified.

## Quality And Tech Debt

Update `docs/QUALITY_SCORE.md` when cleanup changes or discovers quality status. Track domain, architecture health, tests, runtime evidence, docs freshness, tech debt, risk level, score, and recommended next cleanup. If missing, report it and recommend creating it.

Update `docs/exec-plans/tech-debt-tracker.md` for issues not fixed in the current run. Do not hide unresolved cleanup issues only in chat or Linear. Each entry:

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

## Linear And ExecPlan

If linked to Linear, update Linear after repository state is updated. Follow `docs/agents/_shared/linear-policy.md`.

If linked to an ExecPlan, update Progress, Surprises & Discoveries, Decision Log, Validation, and Outcomes & Retrospective as relevant.

Linear tracks cleanup status only. Repository files remain source of truth.

## Codex Audit

Required if cleanup touches risky behavior or architecture boundaries. Risk categories and default handling are centralized in `docs/agents/_shared/risk-policy.md`.

Purely docs-only or non-behavioral local refactor may skip Codex Audit unless policy says otherwise.

## Stop When

Stop when cleanup target or required context is unclear; behavior change, architecture redesign, business decision, or scope expansion is required; blocking `OPEN_DECISION` exists; production credentials/data are needed; checks cannot run; risky cleanup lacks Codex Audit requirement; or behavior preservation cannot be established.

## Verdicts

Use exactly one:

```text
CLEANUP_COMPLETE_PENDING_REVIEW
REQUEST_CHANGES
BLOCKED_BY_MISSING_CONTEXT
BLOCKED_BY_OPEN_DECISION
BLOCKED_BY_SCOPE_EXPANSION
BLOCKED_BY_BEHAVIOR_CHANGE_REQUIRED
BLOCKED_BY_ARCHITECTURE_DECISION
BLOCKED_BY_MISSING_CHECKS
BLOCKED_BY_RISKY_CHANGE
```

## Required Output

Every Cleanup run ends with:

```text
Verdict:
Summary:
Cleanup target:
Changed files:
Checks run:
Behavior preserved:
Architecture status:
AI slop issues fixed:
Tech debt recorded:
QUALITY_SCORE update:
Linear update:
ExecPlan update:
Risks:
OPEN_DECISIONs:
Codex Audit required:
PR/Diff:
Next recommended mode:
```

If cleanup completed:

```text
Verdict: CLEANUP_COMPLETE_PENDING_REVIEW
Next recommended mode: Review
```

If cleanup requires fixes:

```text
Verdict: REQUEST_CHANGES
Next recommended mode: Fix
```

If blocked:

```text
Verdict: BLOCKED_BY_[REASON]
Next recommended step: Resolve blocker before continuing
```
