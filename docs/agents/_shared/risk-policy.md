# Shared Risk Policy

Risky work requires explicit source-of-truth scope, validation, and the review path defined by `AGENTS.md`, `ARCHITECTURE.md`, and the active ExecPlan or repo task.

Risky work includes:

- CRM writes
- customer messaging
- pricing or payments
- auth or security behavior
- database migrations
- lifecycle/status/state changes
- external integrations
- production data or automation
- LLM business behavior
- architecture boundaries

Default rules:

- Preserve behavior unless the active ExecPlan or repo task explicitly allows a change.
- Do not use production credentials or production data in agentic runs.
- Do not send customer messages unless explicitly planned and approved.
- Create or report `OPEN_DECISION` when risk-related behavior is unresolved.
- Blocking `OPEN_DECISION`s stop implementation until Human Architect resolves them.
- Risky production changes require Codex Audit before final approval.
