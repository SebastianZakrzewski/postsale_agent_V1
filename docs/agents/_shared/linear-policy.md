# Shared Linear Policy

Linear is a tracker, not a source of truth.

Linear may track status, priority, owner, PR links, review state, audit state, and progress. It must not be the only source for architecture, business rules, API contracts, database schema, lifecycle/status behavior, side effects, integrations, AI behavior, idempotency/retry policy, or runtime validation.

Repository source-of-truth order:

1. Explicit Human Architect decision.
2. `docs/decision-log.md`.
3. Active repo task in `docs/tasks/`.
4. Active ExecPlan in `docs/exec-plans/active/`.
5. Approved product/design docs.
6. `ARCHITECTURE.md`.
7. Code/tests behavior.

Before implementation, Linear work must resolve to an accepted repo task in `docs/tasks/` or an active ExecPlan in `docs/exec-plans/active/`.

When Linear is used, update it only after repository docs reflect the current source-of-truth state.
