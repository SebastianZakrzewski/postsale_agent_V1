# SellGenius Agent Map

Entry map for agents. `docs/` is the source of truth; this file only defines routing, roles, and hard stops.

## Principle

Humans decide. Composer implements. Codex audits. Checks verify. Human Architect gives final approval.

Do not invent business rules, architecture, status names, data behavior, side effects, or integration behavior. Unknowns become `OPEN_DECISION`s.

## Runtime And Sources

- Primary execution: Cursor Composer 2.5.
- Risky production audit: Codex.
- Final approval: Human Architect.

Use only explicit human instruction, the active execution plan, `ARCHITECTURE.md`, `docs/`, `docs/decision-log.md`, and existing tests/code behavior. If sources conflict or required behavior is unclear, stop and report `OPEN_DECISION`.

Implementation-ready tasks live in `docs/tasks/` and follow `docs/tasks/_template.md`.

## Context Budget

Follow Context Budget Rules in `docs/agents/runtime-strategy.md`: use the smallest sufficient context; state required files before reading; grep/search first; keep summaries short; after each iteration preserve only changed files, hypothesis, test result, metric delta, and next decision.

## Read Before Work

Always read:

1. `AGENTS.md`
2. `docs/agents/runtime-strategy.md`
3. `ARCHITECTURE.md`
4. active plan in `docs/exec-plans/active/`
5. relevant product spec in `docs/product-specs/`
6. relevant mode in `docs/agents/modes/`

For risky work, also read `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`, `docs/open-decisions.md`, and `docs/decision-log.md`.

Risky work = CRM writes, customer messaging, pricing/payments, auth/security, database migrations, state changes, external integrations, production data/automation, LLM business behavior, or architecture boundaries. Risky production changes require Codex audit.

## Modes

Use one mode per run: Architect, Task Designer, Implementation, Review, Fix, QA, Cleanup, Docs Maintenance, or Codex Audit.

Do not mix planning, coding, fixing, review, and approval unless explicitly instructed.

## Default Flow

```text
Human intent
→ Architect
→ product spec draft in docs/product-specs/ (real project ExecPlans)
→ Human Architect approves product spec
→ human closes blocking OPEN_DECISIONs
→ ARCH_READY_FOR_TASK_DESIGNER
→ Task Designer
→ ARCH_READY_FOR_IMPLEMENTATION
→ active execution plan
→ Implementation
→ checks
→ Review
→ Fix if needed
→ checks again
→ Codex Audit for risky changes
→ PR report
→ Review updates `docs/QUALITY_SCORE.md` (mandatory before `APPROVED_*` verdict)
→ human approval
→ merge
→ post-merge: confirm `docs/QUALITY_SCORE.md` matches merged state (Review follow-up or Docs Maintenance)
```

## Quality Score At Review And Merge

After Review passes checks and acceptance criteria for a repo task or PR:

- the Review agent **must update** `docs/QUALITY_SCORE.md` before issuing `APPROVED_FOR_HUMAN_REVIEW` or `APPROVED_FOR_CODEX_AUDIT`
- scores must be evidence-based and conservative; do not inflate
- if checks, runtime evidence, or review scope are incomplete, block approval instead of updating the score optimistically

After Human Architect merge:

- run a short Review follow-up or Docs Maintenance pass if merged changes affect categories not covered in pre-merge review
- `docs/QUALITY_SCORE.md` must not remain stale relative to merged repo tasks, ExecPlan progress, or harness check results

## Implementation Rules

Before editing code:

- load the active plan,
- confirm allowed/forbidden scope,
- write failing tests before business logic,
- implement one behavior at a time,
- run checks,
- fix only reported issues,
- stop on blocking `OPEN_DECISION`s.

Typical checks:

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

## Hard Stops

Stop when docs/plan are missing, behavior is ambiguous, scope expansion is required, checks cannot run, production data/credentials are needed, or risky behavior is unclear.

Agents must not implement production behavior without an active plan, expand scope silently, bypass checks, use production credentials/data, send customer messages unless planned, perform unplanned external side effects, resolve blocking `OPEN_DECISION`s, or approve their own risky work.

Create `OPEN_DECISION` for unresolved decisions about business behavior, architecture, state changes, side effects, pricing, CRM, customer communication, security, reliability, data retention, integrations, or MVP/V1 scope. Blocking `OPEN_DECISION`s stop implementation.

## Final Report

Every implementation, fix, review, cleanup, or audit ends with:

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Next recommended step:
```
