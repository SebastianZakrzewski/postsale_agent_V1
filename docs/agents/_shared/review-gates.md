# Shared Review Gates

Use these gates for Review Mode and Codex Audit, with the stricter mode-specific rules in each mode file.

Verify:

- implementation matches the repo task, active ExecPlan, allowed scope, forbidden scope, and acceptance criteria
- no Linear-only requirement, undocumented business rule, status, enum, schema, contract, AI behavior, hidden side effect, or accidental V2/V3 scope was introduced
- changed files stay inside scope with no silent redesign or unrelated behavior change
- every acceptance criterion has test, check, or runtime validation evidence
- required, task-specific, and stack-specific checks passed
- Runtime Validation `YES` has evidence from `docs/agents/_shared/runtime-evidence.md`
- boundary parsing happens before use cases and side effects
- DTO, Command, Domain, Persistence, Integration Payload, and LLM Output models remain separated
- dependencies follow `ARCHITECTURE.md`
- UI/API do not bypass use cases
- use cases do not import external SDKs directly
- repositories do not contain business decisions
- adapters do not decide lifecycle/status transitions
- n8n-only workflows do not hold critical validation, idempotency, or state transitions
- risky work has idempotency, retry/failure handling, redaction, audit/log/trace evidence, and recovery docs/tests where required
- no production credentials/data, unplanned external effects, or unplanned customer messages were used
- linked ExecPlan updates Progress, Surprises, Decision Log, Validation, and Outcomes when relevant
- docs are updated when behavior, architecture, task status, runtime evidence, or decisions changed
- Linear reflects repository state only
- no AI slop was introduced: duplicate helpers, inconsistent naming, YOLO parsing, raw payload leaks, oversized files, unnecessary abstractions, stale docs, or missing task/PR/Linear/ExecPlan links

Record defects as required fixes or tech debt. Architecture exceptions require `OPEN_DECISION`.
