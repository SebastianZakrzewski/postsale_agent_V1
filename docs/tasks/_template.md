# Task: [Task Title]

Status: Draft | Ready | In Progress | In Review | Codex Audit | QA | Blocked | Done  
Stage: Architecture | Contracts | Domain | Use Case | Persistence | Integration | API | UI | Observability | QA | Cleanup  
Mode: Implementation | Fix | QA | Cleanup | Docs Maintenance  
Owner: [Human / agent role]  
Codex Role: Not Required | Review Required | Audit Required  
Risk Level: Low | Medium | High  
Created: YYYY-MM-DD  
Last updated: YYYY-MM-DD

## Sources

ExecPlan: `docs/exec-plans/active/[plan-name].md`  
Linear: Project / Issue  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, relevant mode, product spec, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business:
- Technical:
- Current behavior:
- Target behavior:

## Technology Context

Application type:

- backend | frontend | fullstack | automation | worker | CLI | library | unknown

Framework/runtime:

- ...

Language:

- ...

Persistence:

- ...

Integrations:

- ...

Testing/runtime validation tools:

- ...

Deployment target:

- ...

Technology assumptions:

- ...

Technology OPEN_DECISIONs:

- ...

## Goal

Expected result:

Complete when:

- ...

## Scope

Allowed changes:

- ...

Likely files/areas:

- ...

## Forbidden Scope

Do not change:

- ...

Do not implement:

- ...

Do not touch:

- ...

## Business Behavior

Expected:

- ...

Forbidden:

- ...

Edge cases:

- ...

## Technical Requirements

Implementation:

- ...

Architecture:

- ...

Model separation:

- DTO:
- Command:
- Domain:
- Persistence:
- Integration Payload:
- LLM Output:

Boundary parsing:

- input source:
- parser/schema/mapper:
- trusted output type:
- failure mode:
- forbidden side effects before parse:

Providers:

- auth:
- CRM/connectors:
- telemetry:
- feature flags:
- LLM:
- messaging:
- payments:

## State Changes

Allowed:

- ...

Forbidden:

- ...

Side effects:

- ...

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit:
- integration:
- regression:
- forbidden behavior:
- edge case:

Test format:

```text
Given:
When:
Then:
Forbidden side effect:
```

## Runtime Validation

Runtime Validation: YES | NO

If YES, evidence required:

- Playwright/browser:
- Chrome DevTools MCP:
- screenshot/DOM snapshot:
- API/network:
- no-console-error:
- sandbox/mock integration:
- structured log/audit event:
- trace/request/workflow ID:
- idempotency:

If NO, reason:

- ...

## Acceptance Criteria

- ...
- ...
- ...

## Validation Commands

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

If relevant:

```bash
bash ./scripts/architecture-check
bash ./scripts/docs-check
bash ./scripts/tasks-check
bash ./scripts/plans-check
```

Project-specific:

```bash
# add commands here
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES | NO  
Reason:

- ...

## OPEN_DECISIONs

Blocking:

- ...

Non-blocking:

- ...

If none: None.

## Linear Mapping

Linear project: ...  
Linear issue: ...  
Linear status: ...

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: ...  
Related PR: ...  
Related reviews: ...  
Related QA evidence: ...  
Related decisions: ...

## History

YYYY-MM-DD - Created - [author/agent]  
YYYY-MM-DD - Updated - [change summary]

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required:
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode:
```
