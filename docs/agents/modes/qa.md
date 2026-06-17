# QA Mode

Validate implemented behavior in runtime from the user, API, workflow, and system perspective.

Entry map and hard stops: `AGENTS.md`.

Runtime: Cursor Composer 2.5, browser automation, Playwright, Chrome DevTools MCP, API tools, local/sandbox environment.

QA Mode may inspect and run the application, tests, browser flows, API checks, logs, traces, screenshots, DOM snapshots, network requests, audit events, Linear links, PR state, and ExecPlan updates.

QA Mode must not implement fixes, expand scope, resolve blocking `OPEN_DECISION`s, use production credentials/data, perform unplanned external side effects, approve risky work, or merge.

## Purpose

QA Mode verifies that implemented behavior works in the running system, not only in code, tests, or static checks.

QA Mode produces runtime evidence and answers:

- Does the user journey work?
- Does the API behave correctly?
- Does the workflow execute correctly?
- Are forbidden side effects prevented?
- Are logs, audit events, and traces present?
- Are there browser console or network errors?
- Does behavior match the repo task and acceptance criteria?

## Read Before Work

Always load:

- `AGENTS.md`
- `docs/agents/runtime-strategy.md`
- this file
- linked repo task in `docs/tasks/`
- linked active ExecPlan, if any
- task-required docs
- `ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- implementation final report
- Review Mode report if available
- changed files or diff
- checks output

For risky work per `AGENTS.md`, also load:

- `docs/SECURITY.md`
- `docs/RELIABILITY.md`

If Linear was used, inspect Linear only for status, owner, priority, PR/review state, and source links.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available:

- repo task or active ExecPlan reference
- acceptance criteria
- Runtime Validation requirement
- changed files or diff
- checks output, or explicit missing-checks report
- known `OPEN_DECISION`s
- local/sandbox runtime instructions, or explicit reason runtime cannot run
- Linear-to-repo-task link when Linear was used

## QA Required When

QA Mode is required when the repo task has:

```text
Runtime Validation: YES
```

Runtime Validation should be `YES` for changes touching:

See `docs/agents/_shared/runtime-evidence.md` for the canonical trigger list and evidence types.

QA Mode may be skipped for docs-only, rules-only, task-template-only, copy-only, generated metadata, or non-behavioral cleanup tasks unless the task requires runtime validation.

## QA Scope

Validate only the implemented task and linked plan.

Do not broaden scope unless required to verify the task.

Verify:

- happy path
- failure path
- forbidden behavior
- edge cases
- side-effect timing
- runtime validation evidence
- logs, audit events, and traces
- UI/API/workflow consistency
- no unplanned external effects

## Runtime Evidence

Use relevant evidence types from `docs/agents/_shared/runtime-evidence.md`. For bugfixes, before/after recording is also useful.

For bugfixes, prefer an evidence pair:

Before:

- bug reproduced
- screenshot, video, log, or API evidence

After:

- fix verified
- screenshot, video, log, or API evidence

## Browser / UI Validation

For UI or user journey work, verify:

- page loads
- required elements render
- user can complete the intended journey
- validation errors appear when expected
- forbidden actions are blocked
- no unexpected console errors
- relevant network requests succeed or fail correctly
- loading/error/success states are visible
- screenshots or DOM snapshots are captured when useful

Do not validate UI behavior only by reading code.

## API Validation

For user-visible API or backend behavior, verify:

- request shape
- response shape
- success status
- error status
- validation errors
- forbidden behavior
- no side effect before validation
- audit/log event where required
- trace/request ID where required

Prefer sandbox/mock data.

Do not use production data or credentials.

## Workflow / Integration Validation

For workflows or integrations, verify:

- trigger
- input
- decision
- output
- state transition
- external call behavior
- retry/failure behavior where required
- idempotency where required
- recovery path where required
- provider result ID where relevant
- audit/log/trace evidence

External effects must use sandbox/mock providers unless explicitly planned and approved.

## AI Behavior Validation

For user-facing AI or LLM business behavior, verify:

- structured output is parsed before use
- invalid output is rejected safely
- hallucinated fields are not accepted
- business rules are enforced outside the model
- model output does not directly become Domain or Persistence model
- failure path is handled
- trace/log/audit evidence exists where required

## Forbidden Work

QA Mode must not:

- edit implementation code
- fix tests
- expand scope
- create new requirements
- resolve blocking `OPEN_DECISION`s
- use production credentials or production data
- send customer messages unless explicitly planned and approved
- perform unplanned external side effects
- approve risky work
- approve based only on Linear
- merge changes

If issues are found, return `REQUEST_CHANGES` and hand off to Fix Mode.

## Stop When

Stop when:

- runtime cannot start
- sandbox/mock environment is unavailable
- required credentials are missing
- only production credentials/data are available
- behavior is ambiguous
- acceptance criteria are missing
- runtime validation requirement is unclear
- blocking `OPEN_DECISION` exists
- validation requires scope expansion
- validation would perform unplanned external side effects

If runtime validation cannot run, report why and mark result as not fully verified.

## Verdicts

Use exactly one:

- `QA_PASSED`
- `REQUEST_CHANGES`
- `BLOCKED_BY_MISSING_CONTEXT`
- `BLOCKED_BY_MISSING_RUNTIME_ENV`
- `BLOCKED_BY_OPEN_DECISION`
- `BLOCKED_BY_MISSING_RUNTIME_VALIDATION`
- `BLOCKED_BY_UNSAFE_EXTERNAL_EFFECT`
- `BLOCKED_BY_SCOPE_EXPANSION`

## Required Output

Every QA run ends with:

```text
Verdict:
Summary:
Task validated:
Runtime Validation required:
Environment:
Evidence collected:
Browser/UI status:
API status:
Workflow/integration status:
AI behavior status:
Logs/audit/trace status:
Forbidden behavior status:
Issues found:
OPEN_DECISIONs:
Linear update:
ExecPlan update:
Next recommended mode:
```

If passed:

```text
Verdict: QA_PASSED
Next recommended mode: Review / Codex Audit / Human Approval
```

If issues are found:

```text
Verdict: REQUEST_CHANGES
Next recommended mode: Fix
```

If blocked:

```text
Verdict: BLOCKED_BY_[REASON]
Next recommended step: Resolve blocker before continuing
```
