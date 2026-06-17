# Implementation Mode

Implement one accepted repository task using test-first, scoped execution.

Entry map and hard stops: `AGENTS.md`.

**Runtime:** Cursor Composer 2.5.  
**May:** edit code, tests, docs directly required by the active task.  
**Must not:** invent business rules, expand scope, implement Linear-only requirements, close blocking `OPEN_DECISION` entries, or approve its own risky work.

## Read Before Work

Always load:

- `AGENTS.md`
- `docs/agents/runtime-strategy.md`
- `docs/agents/modes/implementation.md`
- active repo task from `docs/tasks/`
- active execution plan from `docs/exec-plans/active/` if linked
- required docs listed in the repo task
- `ARCHITECTURE.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`

When risky per `AGENTS.md`, also load:

- `docs/SECURITY.md`
- `docs/RELIABILITY.md`
- `docs/OBSERVABILITY.md`

## Required Preconditions

Implementation may start only when:

- repo task exists in `docs/tasks/` or active plan exists in `docs/exec-plans/active/`,
- repo task follows `docs/tasks/_template.md`,
- task has scope and forbidden scope,
- technology context is defined in the active repo task or ExecPlan when implementation requires framework-specific assumptions,
- `.harness/stack.env` is consistent with the active task or ExecPlan Technology Context when stack-specific checks are required,
- boundary parsing requirements are defined for external or untrusted input,
- acceptance criteria are defined,
- required docs are listed,
- blocking `OPEN_DECISION` entries are closed,
- implementation does not require invented concepts, contracts, statuses, DB schema, integrations, AI behavior, validation, idempotency, retry, or side effects.

If task comes from Linear, it must link to a repo task. Do not implement Linear-only requirements.

## Execution Rules

Implement one bounded task only.

Before editing code:

- confirm task source,
- confirm allowed scope,
- confirm forbidden scope,
- identify risky behavior,
- identify required tests,
- identify required validation commands.

During implementation:

- write failing tests before business logic,
- implement one behavior at a time,
- if implementing from an ExecPlan, keep its Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective sections updated,
- keep changes minimal,
- preserve architecture boundaries,
- preserve existing naming and model separation,
- do not mix DTO, Command, Domain, Persistence, Integration Payload, or LLM Output models,
- do not put critical business logic in UI, controller, repository, integration adapter, or n8n-only workflow,
- do not perform side effects before validation,
- do not swallow errors silently.

## Boundary Parsing

Parse external or untrusted input at the system boundary before business execution.

Untrusted input: API requests, UI form data, CRM/webhook payloads, provider responses, LLM raw outputs, file uploads, DB reads needing extra validation.

```text
raw input → parser/schema/mapper → trusted Command / Domain / Value Object → use case → side effect
```

Do not spread ad-hoc validation across controllers, UI, repositories, integrations, or use cases. Do not run side effects before boundary parsing and validation succeed.

If no parser/schema/mapper exists, create it within task scope or stop if scope would expand. If boundary parsing behavior is unclear, stop and report `OPEN_DECISION`.

## Test-First Rule

No business logic without a failing test or explicit test update.

Docs-only, config-only, generated metadata, or non-behavioral cleanup tasks may skip failing tests only when the repo task explicitly marks testing as not applicable.

For each behavior, prefer:

```text
Given:
When:
Then:
Forbidden side effect:
```

Cover:

- happy path,
- failure path,
- forbidden behavior,
- edge case,
- side-effect timing where relevant.

## Runtime Validation

If task has `Runtime Validation: YES`, implementation must produce evidence that the changed behavior works in runtime, not only in static code or unit tests. Evidence types and skip rules are centralized in `docs/agents/_shared/runtime-evidence.md`.

## Checks

Run relevant checks after changes. Use `docs/agents/_shared/validation-commands.md` plus any project-specific commands in the task.

## Linear Update

If task is linked to Linear, update it after repository state changes. Linear policy is centralized in `docs/agents/_shared/linear-policy.md`.

## Codex Audit

All implementation work must proceed to Review Mode. Risky work additionally requires Codex Audit.

If task is risky per `AGENTS.md`, implementation is not complete until Codex Audit is requested or marked required.

Risk categories and default handling are centralized in `docs/agents/_shared/risk-policy.md`.

## Forbidden Work

Implementation Mode must not:

- implement without repo task or active execution plan,
- implement Linear-only requirements,
- expand scope silently,
- create new business rules,
- create undocumented statuses/enums/contracts,
- change DB schema unless explicitly scoped,
- perform unplanned external side effects,
- use production credentials or data,
- send customer messages unless explicitly planned,
- resolve blocking `OPEN_DECISION` entries,
- approve or merge its own risky work.

## Stop When

Stop when:

- repo task or active plan is missing,
- repo task does not follow `docs/tasks/_template.md`,
- required docs are missing,
- acceptance criteria are missing,
- technology context is missing or ambiguous and implementation would require framework-specific assumptions,
- `.harness/stack.env` conflicts with the active task or ExecPlan Technology Context,
- boundary parsing is required but unclear,
- implementation would use raw external input, provider payload, or LLM output as trusted Domain/Persistence data,
- behavior is ambiguous,
- scope expansion is required,
- checks cannot run,
- blocking `OPEN_DECISION` exists,
- production credentials/data are needed,
- risky behavior lacks Codex Audit requirement,
- implementation would require inventing architecture or business behavior.

## Required Output

Every Implementation run ends with:

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required:
Linear update:
PR/Diff:
Next recommended step:
```

If complete and non-risky:

```text
Result: Implementation complete, pending Review
Next recommended mode: Review
```

If risky:

```text
Result: Implementation complete, pending Review and Codex Audit
Next recommended mode: Review / Codex Audit
```

If blocked:

```text
Result: Blocked
Next recommended step: Resolve OPEN_DECISION / update docs / fix missing plan
```
