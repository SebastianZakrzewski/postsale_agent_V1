# Shared Runtime Evidence

Runtime Validation is required when a task touches UI/user journeys, user-visible APIs, workflows, integrations, side effects, lifecycle/status transitions, customer messaging, user-facing AI behavior, or production-like runtime behavior.

Docs-only, rules-only, task-template-only, and non-behavioral cleanup tasks do not require runtime validation unless explicitly requested.

Evidence may include:

- Playwright browser tests
- Chrome DevTools MCP checks
- screenshots or DOM snapshots
- API request/response checks
- network checks
- no-console-error checks
- sandbox or mock integration checks
- structured logs or audit events
- trace, request, workflow, or operation IDs
- idempotency evidence

Evidence must prove the changed behavior, not only compilation. If runtime validation is required but cannot run, report why and mark the result as not fully verified.
