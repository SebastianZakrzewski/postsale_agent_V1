# ExecPlan Standard

ExecPlans are living, self-contained repo plans for complex, risky, multi-step, long-running, research-heavy, architectural, refactor, migration, runtime-validation, or multi-PR work. Do not use them for small, isolated, low-risk changes.

## Source Of Truth

An ExecPlan is source of truth only in `docs/exec-plans/active/`, or after completion in `docs/exec-plans/completed/`.

Linear tracks status, priority, owner, PR, and review state; it is not implementation source of truth. Obsidian may mirror context, lessons, or research; it is not implementation source of truth.

```text
ExecPlan -> docs/tasks/* -> Linear issues -> PRs -> Review / Codex Audit / QA
```

An ExecPlan describes the initiative. Repo tasks describe implementation units. Linear issues track execution state.

## Relationship To Tasks

Repo tasks linked from ExecPlans must be created from `docs/tasks/_template.md`.

## Required Properties

Every ExecPlan must be self-contained, current, linked to relevant docs, explicit about V1 scope and deferred V2/V3, risks, validation, `OPEN_DECISION`s, and execution updates.

A new agent must understand what is being built, why it matters, what happened, what remains, accepted decisions, blockers, and how completion is validated.

## Living Document Rule

Update the plan when tasks complete, block, or enter review; risks or discoveries appear; decisions or assumptions change; validation succeeds or fails; docs/code mismatches are found; runtime evidence is collected; or scope moves to V2/V3.

Do not hide discoveries in chat, Linear, or Obsidian only.

## Required Sections

Every active ExecPlan must include:

```text
Purpose
Context
Technology Context
Mode / Risk Level
Readiness Gates
Source Of Truth
V1 Scope
Deferred V2/V3
Architecture Summary
Repo task list
Dependencies
Progress
Surprises & Discoveries
Decision Log
OPEN_DECISIONs
Validation
Runtime Evidence
Linear Mapping
Risks
Outcomes & Retrospective
```

## Readiness Gates

Real project ExecPlans must track Architect readiness using:

```text
ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC
→ BUSINESS_PROCESS_MAPPING_DRAFT
→ BUSINESS_PROCESS_MAPPING_READY
→ ARCH_READY_FOR_TASK_DESIGNER
→ ARCH_READY_FOR_IMPLEMENTATION
```

Rules:

- No product spec draft means `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC`.
- Draft product spec means `BUSINESS_PROCESS_MAPPING_DRAFT`; drafts are not accepted business rules.
- Human Architect-approved product spec means `BUSINESS_PROCESS_MAPPING_READY`.
- Closed blocking `OPEN_DECISION`s plus accepted architecture context means `ARCH_READY_FOR_TASK_DESIGNER`.
- Linked implementation-ready repo tasks mean `ARCH_READY_FOR_IMPLEMENTATION`.

Harness-only or documentation-only ExecPlans may omit product spec gates when the plan explicitly says so.

See `docs/product-specs/PRODUCT_SPECS.md` and `docs/agents/modes/architect.md`.

## Repo Task List

Each ExecPlan must include a Repo task list.

The Repo task list must link to all implementation-ready repo tasks created from:

`docs/tasks/_template.md`

Each repo task must link back to the ExecPlan.

Linear issues may track task status, but the repo task remains implementation source of truth.

## Progress

Track state with simple entries:

```text
- [done] task-001 - domain contracts created
- [in review] task-002 - use case implementation
- [blocked] task-003 - waiting on OD-004 pricing decision
```

## Surprises & Discoveries

Record implementation facts, for example existing statuses, unexpected side effects, missing edge-case tests, behavior/docs mismatches, adapter constraints, or validation gaps.

## Decision Log And OPEN_DECISIONs

Record execution decisions in the plan. Accepted decisions must be mirrored or linked in `docs/decision-log.md`. Unresolved decisions must be recorded in `docs/open-decisions.md`. Blocking `OPEN_DECISION`s stop completion.

## Validation

Validation must prove completion and include tests, checks, runtime validation, expected and forbidden behavior, QA evidence, and Codex Audit when risky.

If any task has `Runtime Validation: YES`, link or describe evidence such as Playwright tests, Chrome DevTools MCP checks, screenshots, DOM snapshots, API/network checks, no-console-error checks, logs, audit events, trace/request/workflow IDs, or idempotency evidence.

## Completion

Move a plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/` only when all V1 tasks are complete or explicitly deferred, validation is complete, Codex Audit and QA are complete when required, Linear reflects repo state, decisions are recorded, and the retrospective is written.

## Forbidden

Agents must not implement from ExecPlan alone when a repo task is required; treat Linear as source of truth; keep discoveries only in chat; mark plans complete with blocking `OPEN_DECISION`s; omit validation evidence; or silently move unresolved V1 work to done.
