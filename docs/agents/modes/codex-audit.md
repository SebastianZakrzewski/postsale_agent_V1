# Codex Audit Mode

Independent Codex audit gate for risky production changes after Review Mode.

Entry map and hard stops: `AGENTS.md`. Runtime: Codex. Codex audits by default and must not fix unless explicitly reassigned to Fix Mode or another approved implementation task.

## Purpose

Validate that the implemented task is safe, scoped, testable, observable, and consistent with repository source of truth before Human Architect approval.

## Read Before Work

Always load:

- `AGENTS.md`
- `docs/agents/runtime-strategy.md`
- this file
- linked repo task in `docs/tasks/`
- linked active ExecPlan, if any
- task-required docs
- `ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/RELIABILITY.md`
- `docs/OBSERVABILITY.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`
- implementation final report
- Review Mode report
- changed files or diff
- checks output
- runtime evidence if required
- PR state if available

If Linear was used, inspect it only for status, owner, priority, PR/review state, and source links.

## Start Preconditions

Return `BLOCKED_BY_MISSING_CONTEXT` unless available:

- repo task or active ExecPlan reference
- changed files or diff
- implementation final report
- Review Mode report
- checks output, or explicit missing-checks report
- known `OPEN_DECISION`s
- Linear-to-repo-task link when Linear was used
- runtime evidence when required

## Required Scope

Audit only the implemented task and linked plan. Codex Audit approval does not mean merge approval; Human Architect decides final approval and merge. Codex Audit is required for CRM writes, customer messaging, pricing/payments, auth/security, database migrations, state changes, external integrations, production data/automation, LLM business behavior, and architecture boundaries. Non-risky tasks may still require audit by Human Architect, Review Mode, CI, or policy.

## Audit Gates

Apply `docs/agents/_shared/review-gates.md` with Codex-level independence and stricter scrutiny for risky work, including boundary parsing, model separation, architecture boundaries, security, reliability, observability, runtime evidence, and AI slop.

Codex-specific additions:

- Review findings were addressed or correctly deferred
- runtime evidence proves expected and forbidden behavior when relevant
- side effects occur only after validation and boundary parsing
- idempotency exists where repeated execution is possible
- retry/failure behavior is defined where needed
- rollback/recovery path is documented where needed
- structured logs, audit events, trace/request/workflow IDs exist where required
- sensitive data is redacted

### Technology Context Gate

Codex Audit must verify Technology Context for risky production changes when implementation depends on framework, runtime, persistence, integrations, deployment, testing tools, or runtime validation tools.

Check that:

- Technology Context is present in the active repo task or ExecPlan,
- risky behavior does not rely on undefined technology assumptions,
- framework-specific implementation follows the declared Technology Context,
- integration, persistence, security, reliability, and observability behavior match the declared stack,
- no risky implementation decision is derived only from Linear, chat memory, or unstated assumptions.

If Technology Context is missing or ambiguous for risky framework-specific work, return:

`BLOCKED_BY_MISSING_TECHNOLOGY_CONTEXT`

## AI Slop / Golden Rules

Check for duplicate helpers, inconsistent naming, YOLO parsing, raw payload leaks, oversized files, unnecessary abstractions, stale docs, missing task/PR/Linear/ExecPlan links, hidden side effects, scattered validation, business logic in UI/controllers/repositories/adapters/n8n-only workflows, and undocumented architecture exceptions. Record minor issues as tech debt. Block serious issues.

## Security / Reliability / Observability

For risky changes, verify no secret or PII leakage, no production credential/data usage, no uncontrolled external side effects, redaction compliance, explicit errors, bounded safe retries, idempotency against duplicate side effects, defined failure modes and recovery, meaningful audit logs, and enough observability evidence to debug after deployment.

## Boundary Parsing

Verify API, CRM, webhook, n8n, LLM, file, form, and external SDK inputs are parsed at boundaries into trusted Command, Domain, or Value Object types; use cases receive trusted internal types; invalid input is rejected before state changes or side effects; validators that return no useful typed result are not used instead of precise boundary parsing where practical.

## Forbidden Work

Codex Audit must not edit implementation code, fix tests, expand scope, create tasks unless requested, resolve blocking `OPEN_DECISION`s, approve from Linear alone, approve with missing checks or runtime evidence, approve architecture exceptions without `OPEN_DECISION`, or merge. If fixes are needed, return `REQUEST_CHANGES` and hand off to Fix Mode.

## Verdicts

Use exactly one:

```text
APPROVED_FOR_HUMAN_REVIEW
REQUEST_CHANGES
BLOCKED_BY_OPEN_DECISION
BLOCKED_BY_SCOPE_VIOLATION
BLOCKED_BY_MISSING_CONTEXT
BLOCKED_BY_MISSING_TECHNOLOGY_CONTEXT
BLOCKED_BY_MISSING_CHECKS
BLOCKED_BY_MISSING_RUNTIME_VALIDATION
BLOCKED_BY_ARCHITECTURE_VIOLATION
BLOCKED_BY_SECURITY_RISK
BLOCKED_BY_RELIABILITY_RISK
BLOCKED_BY_OBSERVABILITY_GAP
BLOCKED_BY_LINEAR_SOURCE_OF_TRUTH_VIOLATION
BLOCKED_BY_EXECPLAN_DRIFT
BLOCKED_BY_AI_SLOP
```

## Required Output

Every Codex Audit run ends with:

```text
Verdict:
Summary:
Task audited:
Risk category:
Changed files audited:
PR/Diff status:
Checks audited:
Runtime evidence audited:
Boundary parsing status:
Architecture status:
Model separation status:
Security issues:
Reliability issues:
Observability issues:
ExecPlan status:
Linear status:
AI slop / golden-rule issues:
OPEN_DECISIONs:
Required fixes:
Tech debt:
Next recommended mode:
```

If approved:

```text
Verdict: APPROVED_FOR_HUMAN_REVIEW
Next recommended mode: Human Approval
```

If fixes are needed:

```text
Verdict: REQUEST_CHANGES
Next recommended mode: Fix
```

If blocked:

```text
Verdict: BLOCKED_BY_[REASON]
Next recommended step: Resolve blocker before continuing
```
