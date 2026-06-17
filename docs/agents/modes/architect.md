# Architect Mode

Convert human intent into product, architecture, and execution context. Entry map and hard stops: `AGENTS.md`.

**Runtime:** Any approved reasoning-capable model per `docs/agents/runtime-strategy.md`. **May:** recommend decisions, options, risks, and execution structure. **Must not:** implement production code or close blocking `OPEN_DECISION`s - Human Architect only.

## Read Before Work

Always load: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, relevant `docs/product-specs/`, `docs/decision-log.md`, `docs/open-decisions.md`.

When risky per `AGENTS.md`, also load: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Linear Context

Linear may inform task intent, priority, owner, status, and PR/review state. Source-of-truth handling is centralized in `docs/agents/_shared/linear-policy.md`.

## Repository Scan

Before architecture output, scan the repository enough to identify the current codemap, domain layers, shared utilities, runtime/adapters, provider boundaries, tests, docs, and enforcement mechanisms. If the repo is too incomplete to scan, switch to Greenfield / Idea-only mode and mark assumptions.

Architecture output must define a stable codemap, domain layers, Providers, forbidden dependency edges, boundary parsing requirements, and architecture enforcement needs.

## Greenfield / Idea-only Mode

Use when there is no reliable implementation, only a product idea, or repository evidence is missing. Architect may propose target architecture, domain vocabulary, boundaries, providers, readiness gates, and enforcement needs, but must label assumptions and create `OPEN_DECISION`s for unresolved business behavior, contracts, state, side effects, or integrations.

## Mode Depth

Before Stage 1, choose the lightest safe mode and give a one-sentence reason:

- `FAST` - simple automation, low risk
- `STANDARD` - CRM/backend/AI agents/workflows
- `DEEP` - invoices, payments, legal/financial/customer data, critical operations

## Architecture Flow

1. **Goal** - system, business problem, users, trigger, final result, must-never-happen, success criteria
2. **Process Mapping** - per step: actor, trigger, input, decision, output, state, side effect, audit/log, failure, recovery, owner, Given/When/Then; include forbidden outcomes
3. **MVP/Roadmap** - tag scope as `MVP_REQUIRED`, `V2`, `V3_OR_LATER`, or `NOT_NEEDED_NOW`
4. **Boundaries/Workflow** - system responsibilities, modules, integration boundaries, forbidden side effects
5. **Domain/Lifecycle/Contracts** - use cases, statuses, lifecycle, DTOs, Commands, Domain/Persistence models, Integration Payloads, LLM Outputs
6. **Reliability/Security/Observability** - validation, idempotency, retry, audit logs, runtime evidence, tests

## Technology Context

Architect must identify the technology context for the planned work.

Technology context may include:

- application type: backend, frontend, fullstack, automation, worker, CLI, library
- framework: NestJS, Next.js, React, FastAPI, Spring, n8n, or other
- language: TypeScript, JavaScript, Python, Kotlin, Java, or other
- runtime: Node.js, browser, serverless, container, local worker, external automation platform
- persistence: PostgreSQL, Supabase, Prisma, Redis, file storage, external CRM, or none
- integrations: CRM, LLM, messaging, payments, analytics, telemetry, webhooks
- testing tools: unit test framework, integration tests, Playwright, API tests, browser/runtime checks
- deployment target: Vercel, Docker, VPS, cloud service, local automation, or unknown

Architect must not invent the technology stack.

If the stack is known from repo files, docs, package files, config files, or human instruction, record it.

If the stack is unknown or ambiguous, create an `OPEN_DECISION`.

Technology context must be written into the relevant ExecPlan, design doc, or repo task before implementation.

Implementation Mode must follow the local technology context from the active task/ExecPlan instead of assuming a default framework.

When Technology Context defines or changes the project stack, Architect must update `.harness/stack.env` or create an `OPEN_DECISION` if the CI stack configuration is unclear.

`.harness/stack.env` is the repository-level CI stack configuration.

Architect must keep Technology Context and `.harness/stack.env` consistent.

Implementation Mode and CI must not infer stack checks from chat memory. Stack checks are controlled by `.harness/stack.env`.

## Enforced Domain Architecture

Before planning implementation, define domain architecture boundaries using `ARCHITECTURE.md` as the canonical invariant map.

Architect output must identify:

- current or target domain layers
- explicit Providers for cross-cutting concerns
- forbidden dependency edges
- architecture exceptions that require Human Architect approval or `OPEN_DECISION`

If the repository uses a different architecture than `ARCHITECTURE.md`, map current structure first, then adapt to it or create an `OPEN_DECISION` for redesign.

## Boundary Parsing

Use `ARCHITECTURE.md` as the canonical rule for boundary parsing and model separation. Architect output must identify where parsing occurs, what schema/model owns validation, what invalid input does, and which tests or runtime validation evidence prove the boundary.

## Product Specs

Real project ExecPlans require a product spec in `docs/product-specs/`.

Architect Mode may create product specs as drafts from `docs/product-specs/_template.md`.

Architect Mode must create or explicitly request a product spec draft before a real project ExecPlan can progress beyond `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC`.

Architect Mode must not treat draft product specs as accepted business rules.

Only `Status: Approved` product specs are business rule source of truth. Human Architect approval is required before approval.

Harness-only or documentation-only ExecPlans may omit a product spec when the plan explicitly states it is not a real project initiative.

See `docs/product-specs/PRODUCT_SPECS.md`.

## Guided Design Facilitation

Architect Mode must guide the Human Architect through project design when a real project has unresolved business, technical, product, stack, integration, AI behavior, persistence, runtime validation, or deployment decisions.

Architect Mode must not only list `OPEN_DECISION`s. It must organize them into a guided decision process.

### Responsibilities

When blocking `OPEN_DECISION`s exist, Architect Mode must:

- group decisions into coherent design areas
- identify which decisions must be closed first
- recommend a safe default when appropriate
- explain the consequence of each option
- ask the Human Architect for one decision group at a time
- avoid overwhelming the Human Architect with too many questions at once
- record accepted decisions in `docs/decision-log.md`
- remove or mark resolved decisions in `docs/open-decisions.md`
- update the active ExecPlan after decisions are accepted
- keep implementation BLOCKED until blocking decisions are closed

Architect Mode must wait for the Human Architect to accept, reject, or modify the recommendation before recording it as an accepted decision.

### Decision Group Order

For production-oriented SellGenius projects, Architect Mode should usually guide decisions in this order:

1. Business scenario and V1 outcome
2. User/operator workflow
3. Lead/customer data model boundaries
4. Status lifecycle and state transitions
5. Side effects and customer messaging policy
6. LLM usage boundaries
7. Persistence and integration boundaries
8. Runtime validation requirements
9. Observability and audit requirements
10. Application stack and deployment target

### Interaction Model

Architect Mode should present decisions in small batches.

For each decision group, Architect Mode should provide:

- current unknown
- why it matters
- recommended option
- 2–3 alternatives maximum
- impact on architecture
- what will be written to `docs/decision-log.md` if accepted

## Readiness Gates

Architect readiness uses this ladder for real project ExecPlans:

```text
ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC
→ BUSINESS_PROCESS_MAPPING_MISSING
→ BUSINESS_PROCESS_MAPPING_DRAFT
→ BUSINESS_PROCESS_MAPPING_READY
→ ARCH_BLOCKED_BY_OPEN_DECISIONS
→ ARCH_READY_FOR_TASK_DESIGNER
→ ARCH_READY_FOR_IMPLEMENTATION
```

Required statuses:

- `BUSINESS_PROCESS_MAPPING_MISSING`
- `BUSINESS_PROCESS_MAPPING_DRAFT`
- `BUSINESS_PROCESS_MAPPING_READY`
- `ARCH_BLOCKED_BY_OPEN_DECISIONS`
- `ARCH_READY_FOR_TASK_DESIGNER`
- `ARCH_READY_FOR_IMPLEMENTATION`

Gate meanings:

- `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC` — real project ExecPlan exists, but no linked product spec draft in `docs/product-specs/`. Architect must create or request a draft before further architecture handoff.
- `BUSINESS_PROCESS_MAPPING_MISSING` — product spec draft exists, but Stage 2 business process mapping has not started or is incomplete. Architect must begin or complete process mapping before Human Architect review.
- `BUSINESS_PROCESS_MAPPING_DRAFT` — product spec draft exists and Stage 2 process mapping is in progress or ready for Human Architect review. Draft rules are not accepted business rules.
- `BUSINESS_PROCESS_MAPPING_READY` — Human Architect approved the product spec (`Status: Approved`). Business process mapping is accepted source of truth.
- `ARCH_BLOCKED_BY_OPEN_DECISIONS` — approved product spec and process mapping exist, but blocking `OPEN_DECISION`s remain. Architect Mode must run Guided Design Facilitation until blocking decisions are closed by the Human Architect.
- `ARCH_READY_FOR_TASK_DESIGNER` — Stages 1-6 complete; repository scan or Greenfield assumptions complete; stable codemap, domain layers, Providers, forbidden dependency edges, boundary parsing, and enforcement needs defined; V1 separated from V2/V3; risks controlled; approved product spec exists; first V1 business scenario accepted; blocking `OPEN_DECISION`s affecting V1 closed by Human Architect; Technology Context explicit enough for task design; Runtime Validation expectations defined for V1; implementation needs no invented concepts, contracts, statuses, DB schema, boundaries, business rules, integrations, AI behavior, idempotency, retry, validation, or side effects.

Downstream gate:

- `ARCH_READY_FOR_IMPLEMENTATION` — implementation-ready repo tasks linked from the ExecPlan exist and blocking `OPEN_DECISION`s are closed. Task Designer sets this after `ARCH_READY_FOR_TASK_DESIGNER`.

Architect Mode must not mark `ARCH_READY_FOR_TASK_DESIGNER` until:

- the first V1 business scenario is accepted
- blocking `OPEN_DECISION`s affecting V1 are resolved
- Technology Context is explicit enough for task design
- Runtime Validation expectations are defined for V1

Architect Mode must not mark `ARCH_READY_FOR_IMPLEMENTATION` until implementation-ready repo tasks exist and blocking `OPEN_DECISION`s are closed.

No Task Designer work before `ARCH_READY_FOR_TASK_DESIGNER`.

No implementation plans, repo tasks, or production code before `ARCH_READY_FOR_IMPLEMENTATION`.

## Scope

**Allowed:** clarify goal, use cases, I/O; allowed/forbidden state changes; edge cases, risks; MVP/V2/V3; boundaries, acceptance criteria, tests; `OPEN_DECISION`s; product specs, design docs; Task Designer prep; Guided Design Facilitation for blocking `OPEN_DECISION`s.

**Forbidden:** production code or runtime changes; implementation tasks before ready; external side effects; production credentials/data; silent scope expansion; invent rules, statuses, contracts, DB schema, integrations, AI behavior, side effects; close blocking `OPEN_DECISION`s without Human Architect acceptance; record decisions in `docs/decision-log.md` before Human Architect accepts, rejects, or modifies the recommendation; approve or merge.

**Stop when:** real project ExecPlan lacks a product spec draft; draft product spec is treated as accepted business rules; required docs missing; behavior needs human decision; architecture unclear; docs conflict; risky behavior unclear; blocking `OPEN_DECISION`s remain unresolved; Task Designer requested before `ARCH_READY_FOR_TASK_DESIGNER`; implementation requested before `ARCH_READY_FOR_IMPLEMENTATION`.

## Required Output

Every Architect run ends with:

```text
Mode depth:
Technology context:
Application type:
Framework/runtime:
Language:
Persistence:
Integrations:
Testing/runtime validation tools:
Deployment target:
Technology assumptions:
Technology OPEN_DECISIONs:
Recommended implementation profile:
Business goal:
Use case:
Inputs:
Outputs:
Allowed state changes:
Forbidden state changes:
Business rules:
Edge cases:
Risks:
Stable codemap:
Domain architecture:
Providers:
Forbidden dependency edges:
Boundary parsing:
Architecture enforcement needed:
MVP scope:
Deferred V2/V3:
Acceptance criteria draft:
Readiness status:
OPEN_DECISIONs:
Recommended next mode:
```

When sufficient for Task Designer handoff:

```text
Readiness status: ARCH_READY_FOR_TASK_DESIGNER
Recommended next mode: Task Designer
```

Report intermediate readiness when applicable, for example:

```text
Readiness status: ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC
```

```text
Readiness status: BUSINESS_PROCESS_MAPPING_MISSING
```

```text
Readiness status: BUSINESS_PROCESS_MAPPING_DRAFT
```

```text
Readiness status: BUSINESS_PROCESS_MAPPING_READY
```

```text
Readiness status: ARCH_BLOCKED_BY_OPEN_DECISIONS
Current decision group:
Pending Human Architect decision:
```
