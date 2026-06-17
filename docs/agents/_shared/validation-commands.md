# Shared Validation Commands

Canonical harness validation for this repository uses bash scripts from `scripts/`.

Run the narrowest relevant script during a docs or code batch, then run the full harness before marking the batch complete.

```bash
bash ./scripts/docs-check
bash ./scripts/architecture-check
bash ./scripts/plans-check
bash ./scripts/tasks-check
bash ./scripts/harness-check
```

`bash ./scripts/harness-check` runs the docs, architecture, plans, tasks, and stack checks in CI order.

Stack-specific test, lint, typecheck, build, Playwright, and runtime checks run only when enabled by `.harness/stack.env` and required by the active ExecPlan or repo task.

Do not claim success without running the required checks or reporting why they could not run.
