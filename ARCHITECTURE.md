# Architecture

This file is the architecture map for this repository. It is not full documentation: it explains where things live, how major parts relate, and which boundaries must not be crossed.

## Purpose

This repository must be readable and safe for agentic engineering. Architecture should:

- make business behavior explicit and system boundaries visible,
- make invalid dependency edges detectable,
- keep agent-generated code predictable,
- prevent business logic from leaking into the wrong layers,
- ensure external input is parsed before execution,
- keep risky side effects controlled, observable, and auditable.

## System Overview

This system belongs to SellGenius and supports production-oriented business systems, especially AI automations, sales process automation, CRM/ERP integrations, backend workflows, lead recovery, offer generation, customer messaging, analytics, and operational dashboards.

Optimize for stable V1 delivery, controlled scope, business value, safety, testability, observability, and maintainability for future agent runs.

## Technology Context

This architecture is framework-agnostic by default.

Architect Mode must define technology context before implementation when technology choice affects structure, tests, runtime validation, dependency rules, or side effects.

Implementation Mode must not assume any framework, runtime, persistence layer, deployment target, integration provider, or testing tool unless it is defined in the active repo task or active ExecPlan.

Design docs may provide supporting context, but the active task or ExecPlan must carry the implementation-relevant Technology Context before implementation starts.

If Technology Context is missing or ambiguous and implementation would require technology-specific assumptions, implementation must stop and report an `OPEN_DECISION`.

`.harness/stack.env` defines repository-level CI stack behavior.

It controls whether stack-specific checks such as Node, Python, or Playwright checks should run.

Technology Context defines the intended stack. `.harness/stack.env` translates that stack into executable CI flags.

## Codemap

Use this section to describe stable repository structure, domain boundaries, and important entry points. Do not document every file. Update this codemap when stable architecture changes.

```text
src/
  domains/
  app/
  api/
  components/
  lib/
  integrations/
  tests/
docs/
  agents/
  exec-plans/
  tasks/
  product-specs/
  design-docs/
  generated/
  references/
```

## Default Domain Architecture

Each business domain should follow a predictable layered structure unless Human Architect approves another model.

Default dependency direction:

```text
types/schemas
-> config
-> repository/ports
-> services
-> use-cases
-> runtime/adapters
-> API/UI
```

- `types/schemas` define shared types, schemas, and contracts.
- `config` defines domain configuration and feature flags.
- `repository/ports` define persistence interfaces and data access boundaries.
- `services` contain reusable domain/application services.
- `use-cases` orchestrate business behavior.
- `runtime/adapters` connect use cases to runtime systems, external providers, jobs, webhooks, and workflows.
- `API/UI` exposes behavior to users or clients.

If the existing repository uses a different structure, map the current structure first and adapt to it unless Human Architect approves redesign.

## Providers

Cross-cutting concerns must enter through explicit Providers, for example `AuthProvider`, `CrmProvider`, `TelemetryProvider`, `FeatureFlagProvider`, `LlmProvider`, `MessagingProvider`, and `PaymentProvider`.

Use cases must not import external SDKs directly.

Preferred:

```text
use-case
-> provider interface
-> adapter implementation
-> external SDK/API
```

Forbidden:

```text
use-case
-> external SDK directly
```

## Boundary Parsing And Model Separation

External or untrusted input must be parsed at system boundaries before business execution. External input includes API requests, CRM webhooks, n8n triggers, UI forms, uploaded files, external SDK responses, LLM structured outputs, and database reads when schema alone is insufficient.

Required flow:

```text
raw external input
-> parser/schema/mapper
-> trusted Command / Domain / Value Object
-> use case
-> side effect
```

Forbidden flow:

```text
raw external input
-> use case
-> scattered validation
-> side effect
```

Do not spread ad-hoc validation across UI, controllers, repositories, integrations, and use cases. Use precise internal types where practical. Invalid states should be unrepresentable where reasonable.

Do not mix models:

| Model type | Purpose |
| --- | --- |
| DTO | Request/response shape |
| Command | Use-case input |
| Domain | Business rules and valid business state |
| Persistence | Database model |
| Integration Payload | External API/provider payload |
| LLM Output | Structured AI response before parsing |

Required model flow:

```text
DTO
-> parser/schema
-> Command
-> Domain
-> Persistence / Integration Payload
```

LLM output and provider payloads are untrusted until parsed.

## Business Logic Placement

Business rules belong in Domain, Use Cases, and domain/application Services.

Business rules must not live primarily in UI components, API controllers, repositories, integration adapters, n8n-only workflows, raw prompts, or Linear issues.

Controllers route. Repositories persist. Adapters translate. Use cases decide.

## Side Effects

Side effects include CRM writes, customer messages, payment operations, database writes, status/lifecycle changes, webhook calls, external API calls, and production automation.

Side effects may run only after input is parsed, validation succeeds, required business rules pass, idempotency is checked when relevant, required permissions/consent are confirmed, and audit/log context is available.

Forbidden:

```text
validate after side effect
```

Required:

```text
validate first
-> execute side effect
-> log/audit result
```

## Reliability And Observability

Risky workflows must define idempotency strategy, retry behavior, timeout behavior, failure mode, recovery path, audit event, and observability evidence. Repeated execution must not create duplicate unsafe side effects such as duplicate CRM status updates, SMS messages, payments, offers, or workflow transitions.

Important business behavior must produce structured observability. Prefer events with:

- `workflow_id`
- `request_id`
- `operation_id`
- `idempotency_key`
- `status_before`
- `status_after`
- `provider_result_id`
- `error_code`
- `recovery_state`
- `retry_allowed`

Critical actions should be visible through structured logs, audit events, traces, runtime validation evidence, and QA artifacts when needed.

## Security

Default rules:

- Do not commit secrets or log secrets.
- Do not use production credentials in agentic runs.
- Do not use production data unless explicitly approved.
- Redact PII in logs and test artifacts.
- Customer messaging must be explicitly planned and approved.
- Payments, pricing, CRM writes, and customer messaging are risky by default.

Security-sensitive changes require Codex Audit.

## Runtime Validation

Runtime Validation is required when a task touches UI/user journeys, user-visible APIs, workflows, integrations, side effects, lifecycle/status transitions, customer messaging, user-facing AI behavior, or production-like runtime behavior.

Evidence may include Playwright browser tests, Chrome DevTools MCP checks, screenshots or DOM snapshots, API checks, network checks, no-console-error checks, sandbox/mock integration checks, structured log/audit events, trace/request/workflow IDs, and idempotency evidence.

Docs-only, rules-only, task-template-only, and non-behavioral cleanup tasks do not require runtime validation unless explicitly requested.

## ExecPlans, Tasks, And Linear

Use ExecPlans for complex, risky, multi-step, long-running, or multi-task initiatives.

```text
docs/exec-plans/active/
docs/exec-plans/completed/
docs/tasks/
```

Rules:

- ExecPlan describes the larger initiative.
- Repo task describes one implementation unit.
- Linear issue tracks task status.
- PR implements one or more scoped repo tasks.
- Implementation must not rely on Linear-only requirements.

Linear is a tracker, not source of truth. It may store status, owner, priority, PR link, review state, audit state, and progress.

Linear must not be the only source for architecture, business rules, API contracts, DB schema, lifecycle/status behavior, side effects, integrations, AI behavior, idempotency/retry, or runtime validation.

Each implementation-ready Linear issue must link to a repo task in `docs/tasks/`.

## Forbidden Dependency Edges

The following are forbidden unless explicitly approved by Human Architect and recorded as an `OPEN_DECISION` or accepted decision:

- UI imports repositories directly.
- UI contains critical business logic.
- API/controllers contain core business decisions.
- Use cases import external SDKs directly.
- Repositories contain business decisions.
- Adapters decide lifecycle/status transitions.
- Provider payloads are used as Domain models.
- Raw LLM outputs are used as Domain or Persistence models.
- n8n-only workflows contain critical validation, idempotency, or state transitions.
- Side effects run before validation and boundary parsing.
- Production credentials/data are used in local or agentic runs.

## Architecture Enforcement

Architecture should be enforced mechanically where practical.

Target checks:

```bash
bash ./scripts/architecture-check
bash ./scripts/docs-check
bash ./scripts/tasks-check
bash ./scripts/plans-check
```

Future architecture checks should detect forbidden imports, UI to repository imports, use-case to external SDK imports, raw LLM output or provider payload used as domain, missing boundary parser, business logic in the wrong layer, missing Provider abstraction, and missing runtime evidence for risky tasks.

## Golden Rules

- No vibe coding.
- Repo is source of truth.
- One concept equals one name.
- Parse at boundaries.
- No side effects before validation.
- Providers for integrations.
- No Linear-only implementation.
- No raw LLM output as Domain/Persistence model.
- No business logic in UI/controllers/repositories/adapters/n8n-only workflows.
- Review is not Fix.
- Codex audits risky changes.
- Cleanup is continuous.

## Maintenance

Keep this file short. Update `ARCHITECTURE.md` only when stable architecture, boundaries, dependency direction, providers, or invariants change.

Do not put detailed product behavior here. Use `docs/product-specs/`, `docs/design-docs/`, `docs/exec-plans/`, `docs/tasks/`, and `docs/decision-log.md`.

If architecture and code conflict, create or report `OPEN_DECISION` unless an accepted decision already resolves it.
