# Linear Mapping Standard

Linear is used for task intake, status, priority, owner, PR links, review state, and progress tracking.

Linear is not the source of truth for architecture, business behavior, implementation requirements, contracts, DB schema, lifecycle/status behavior, integrations, AI behavior, idempotency, retry, or runtime validation.

Repository source of truth remains:

- `docs/exec-plans/active/*.md`
- `docs/tasks/*.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- `ARCHITECTURE.md`
- `docs/product-specs/`
- code and tests

## Entity Mapping

Use this relationship:

```text
ExecPlan
-> repo tasks
-> Linear issues
-> PRs
-> Review / Codex Audit / QA
```

## Linear Project

Use a Linear Project for larger initiatives. A Linear Project should map to one ExecPlan.

Required Linear Project fields or description content:

- Project name:
- V1 goal:
- Source ExecPlan:
- Repo task list:
- Owner:
- Priority:
- Status:
- Review policy:
- Codex Audit required:
- Runtime Validation required:

The Linear Project must link to `docs/exec-plans/active/[plan-name].md` or, if completed, `docs/exec-plans/completed/[plan-name].md`.

## Linear Issue

Use a Linear Issue for one repo task. Each Linear Issue must link to exactly one source repo task: `docs/tasks/task-xx.md`.

Required Linear Issue content:

- Source repo task:
- ExecPlan:
- Goal:
- Scope:
- Forbidden scope:
- Owner:
- Priority:
- Status:
- Required review:
- Codex Audit required:
- Runtime Validation:
- PR:

Linear Issue may summarize the task, but must not replace the repo task.

## Repo Task

Each repo task must contain a Linear mapping section:

- Linear project:
- Linear issue:
- Linear status:

The repo task remains the implementation source of truth. If Linear says something different than the repo task, the repo task wins unless Human Architect updates repository source of truth.

## PR Mapping

Each PR should link to:

- repo task
- ExecPlan if any
- Linear issue
- Review result
- Codex Audit result if required
- QA evidence if required

PR description should include:

- Source repo task:
- ExecPlan:
- Linear issue:
- Checks run:
- Codex Audit required:
- Runtime Validation:
- OPEN_DECISIONs:

## Status Mapping

Recommended Linear status mapping:

```text
Backlog
-> Ready
-> In Progress
-> In Review
-> Codex Audit
-> QA
-> Human Approval
-> Done
```

Blocked status: `Blocked`.

Use `Blocked` when:

- repo task is missing
- ExecPlan is missing
- required docs are missing
- blocking OPEN_DECISION exists
- checks cannot run
- runtime validation cannot run
- Codex Audit is required but unavailable
- scope conflict exists

## Update Rules

After Implementation, Review, Fix, Codex Audit, QA, Cleanup, or Docs Maintenance, update Linear with:

- current status
- PR link
- checks run
- review/audit result
- runtime validation result if relevant
- risks
- OPEN_DECISION entries
- next recommended step

Update repository source of truth before updating Linear. Do not store decisions, blockers, or implementation requirements only in Linear.

## Forbidden

Agents must not:

- implement from Linear-only requirements
- create implementation-ready Linear issues without repo tasks
- approve production changes based only on Linear
- store decisions only in Linear
- mark Linear Done when repo task, review, audit, QA, or docs are not updated
- use Linear as architecture source of truth

## Drift Handling

If Linear conflicts with repo source of truth:

1. stop
2. report the conflict
3. update repo source of truth if Human Architect confirms
4. then update Linear

If unresolved, create/report OPEN_DECISION.
