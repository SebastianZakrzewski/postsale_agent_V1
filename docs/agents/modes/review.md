# Review Mode

Review one implemented repo task against repo sources, plan, architecture, tests, runtime evidence, scope, and checks. Entry map and hard stops: `AGENTS.md`.

Runtime: Cursor Composer 2.5, or Codex only when explicitly assigned.

May inspect code, tests, docs, diffs, check output, runtime evidence, Linear links, PR state, and ExecPlan updates.

May edit `docs/QUALITY_SCORE.md` only to record review findings and evidence-based scores.

Must not fix code, edit other docs unless handing off to Docs Maintenance, expand scope, resolve blocking `OPEN_DECISION`s, approve risky work without Codex Audit, approve from Linear alone, or merge.

## Read Before Work

Always load:

- `AGENTS.md`
- `docs/agents/runtime-strategy.md`
- this file
- linked repo task in `docs/tasks/`
- linked active ExecPlan, if any
- required docs named by the task
- `ARCHITECTURE.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- `docs/QUALITY_SCORE.md`
- implementation final report
- changed files or diff
- checks output

For risky work per `AGENTS.md`, also load `docs/SECURITY.md`, `docs/RELIABILITY.md`, and `docs/OBSERVABILITY.md`.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available:

- repo task or active ExecPlan reference
- changed files or diff
- implementation final report
- checks output, or explicit missing-checks report
- known `OPEN_DECISION`s
- Linear-to-repo-task link when Linear was used

## Review Gates

Review only the implemented task. Apply `docs/agents/_shared/review-gates.md`, including required checks, runtime evidence, boundary parsing, model separation, architecture boundaries, Linear source-of-truth, and AI slop checks.

Review-specific additions:

- repo task follows `docs/tasks/_template.md` and includes required sections
- missing, failed, or unrunnable checks block approval
- record defects as required fixes or tech debt
- architecture exceptions require `OPEN_DECISION`

### Technology Context Gate

Review must verify that Technology Context is defined when implementation depends on framework, runtime, persistence, integrations, deployment, testing tools, or runtime validation tools.

Check that:

- active repo task or ExecPlan defines Technology Context where needed,
- implementation does not assume an undefined framework or runtime,
- framework-specific structure follows the active task or ExecPlan,
- tests and runtime validation match the declared Technology Context,
- no technology choice is inferred only from chat memory, Linear, or agent assumptions.

Review must verify that `.harness/stack.env` matches the active task or ExecPlan Technology Context when stack-specific checks are required.

If `.harness/stack.env` conflicts with Technology Context, return:

`BLOCKED_BY_STACK_CONFIG_DRIFT`

If Technology Context is missing or ambiguous for framework-specific work, return:

`BLOCKED_BY_MISSING_TECHNOLOGY_CONTEXT`

## QUALITY_SCORE Update (mandatory before approval)

Before ending with `APPROVED_FOR_HUMAN_REVIEW` or `APPROVED_FOR_CODEX_AUDIT`:

1. Load `docs/QUALITY_SCORE.md`.
2. Update `Last updated`, affected category scores, `Problems found`, `Top Risks`, and `History` from the reviewed checks, acceptance criteria, architecture/runtime findings, and task/ExecPlan status.
3. Score conservatively from evidence reviewed in this run. Do not inflate.
4. If required checks, runtime evidence, or review scope are incomplete, do not approve; return a `BLOCKED_*` or `REQUEST_CHANGES` verdict instead of updating the score optimistically.

Review is the default owner of pre-merge `QUALITY_SCORE` updates. After Human Architect merge, run a short Review follow-up or Docs Maintenance pass if merged changes affect categories not covered in pre-merge review.

## Codex Audit Gate

Codex Audit is required for CRM writes, customer messaging, pricing/payments, auth/security, database migrations, state changes, external integrations, production data/automation, LLM business behavior, or architecture boundaries.

If risky and otherwise acceptable, use `APPROVED_FOR_CODEX_AUDIT`. If severity blocks audit readiness, use `BLOCKED_PENDING_CODEX_AUDIT`.

## Verdicts

Use exactly one:

```text
APPROVED_FOR_HUMAN_REVIEW
APPROVED_FOR_CODEX_AUDIT
REQUEST_CHANGES
BLOCKED_BY_OPEN_DECISION
BLOCKED_BY_SCOPE_VIOLATION
BLOCKED_BY_MISSING_CONTEXT
BLOCKED_BY_MISSING_TECHNOLOGY_CONTEXT
BLOCKED_BY_STACK_CONFIG_DRIFT
BLOCKED_BY_MISSING_CHECKS
BLOCKED_BY_MISSING_RUNTIME_VALIDATION
BLOCKED_BY_ARCHITECTURE_VIOLATION
BLOCKED_BY_LINEAR_SOURCE_OF_TRUTH_VIOLATION
BLOCKED_BY_EXECPLAN_DRIFT
BLOCKED_PENDING_CODEX_AUDIT
```

## Required Output

Every Review run ends with:

```text
Verdict:
Summary:
Task reviewed:
Changed files reviewed:
PR/Diff status:
Checks reviewed:
Acceptance criteria status:
Runtime validation status:
Boundary parsing status:
Architecture status:
Model separation status:
Security/reliability/observability issues:
ExecPlan status:
Linear status:
Golden-rule / AI slop issues:
OPEN_DECISIONs:
Codex Audit required:
QUALITY_SCORE update:
Required fixes:
Next recommended mode:
```

Recommended next mode:

- `APPROVED_FOR_HUMAN_REVIEW` -> Human Review; this is not merge approval. Human Architect decides final approval and merge.
- `APPROVED_FOR_CODEX_AUDIT` -> Codex Audit
- `REQUEST_CHANGES` -> Fix
- `BLOCKED_BY_*` -> resolve blocker before continuing
