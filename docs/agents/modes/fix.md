# Fix Mode

Fix only reported issues from Review, Codex Audit, QA, CI, or failed checks.

Entry map and hard stops: `AGENTS.md`. Runtime: Cursor Composer 2.5.

May edit code, tests, docs, or task metadata only when directly required by the reported fix. Must not redesign, expand scope, add features, resolve blocking `OPEN_DECISION`s, implement Linear-only requirements, or approve its own work.

## Read Before Work

Always load:

- `AGENTS.md`
- `docs/agents/runtime-strategy.md`
- this file
- linked repo task in `docs/tasks/`
- linked active ExecPlan, if any
- task-required docs
- `ARCHITECTURE.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- implementation final report
- report requesting fixes: Review, Codex, QA, CI, or checks
- changed files or diff
- current checks output

For risky work per `AGENTS.md`, also load `docs/SECURITY.md`, `docs/RELIABILITY.md`, and `docs/OBSERVABILITY.md`.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available:

- repo task or active ExecPlan reference
- specific reported issue list
- changed files or diff
- latest checks output, or explicit missing-checks report
- known `OPEN_DECISION`s
- Linear-to-repo-task link when Linear was used

## Fix Rules

Before editing, identify:

- source report
- exact issue
- likely affected files
- allowed scope
- forbidden scope
- required tests/checks
- risky-behavior impact

During fixing:

- make the smallest safe change
- fix only the reported issue
- report unrelated discoveries as separate follow-up tasks or tech debt; do not fix them in this run
- preserve original task scope, architecture boundaries, model separation, and boundary parsing
- do not introduce new business behavior, side effects, public contract changes, DB schema changes, or unrelated cleanup unless explicitly required
- update repository source of truth before Linear
- stop and create/report `OPEN_DECISION` if the issue requires a missing decision

## Test And Validation

For behavior fixes, add or update a regression test when practical.

For each fixed behavior, prefer recording:

```text
Given:
When:
Then:
Previously failed because:
Now passes because:
Forbidden side effect:
```

If runtime behavior changes and task has `Runtime Validation: YES`, provide runtime evidence using `docs/agents/_shared/runtime-evidence.md`.

Run relevant checks after the fix using `docs/agents/_shared/validation-commands.md`, and rerun the command that originally failed. If checks cannot run, report why and mark the result not fully verified.

## Linear And ExecPlan

If linked to Linear, update Linear after repository state is updated. Follow `docs/agents/_shared/linear-policy.md`.

If linked to an ExecPlan, update relevant sections when the fix changes progress, validation, discoveries, decisions, outcomes, or retrospective notes. Potential sections: Progress, Surprises & Discoveries, Decision Log, Validation, Outcomes & Retrospective.

Do not store source-of-truth decisions only in Linear.

## Codex Audit

If the fix touches risky behavior per `AGENTS.md`, mark Codex Audit required. Risk categories and default handling are centralized in `docs/agents/_shared/risk-policy.md`.

## Forbidden Work

Fix Mode must not:

- fix unreported issues
- expand scope silently
- redesign architecture
- add V2/V3 scope
- introduce business rules
- create undocumented statuses, enums, or contracts
- change DB schema unless explicitly scoped
- perform unplanned external side effects
- use production credentials or data
- send customer messages unless explicitly planned
- implement Linear-only requirements
- resolve blocking `OPEN_DECISION`s
- approve, audit, or merge its own fix

## Stop When

Stop when the reported issue is unclear, required context is missing, fix requires scope expansion, architecture redesign, business decision, production credentials/data, or inventing behavior; checks cannot run; blocking `OPEN_DECISION` exists; or risky behavior lacks Codex Audit requirement.

## Required Output

Every Fix run ends with:

```text
Summary:
Fixed issues:
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

If fixed and non-risky:

```text
Result: Fix complete, pending Review
Next recommended mode: Review
```

If fixed and risky:

```text
Result: Fix complete, pending Review and Codex Audit
Next recommended mode: Review / Codex Audit
```

If blocked:

```text
Result: Blocked
Next recommended step: Resolve blocker before continuing
```
