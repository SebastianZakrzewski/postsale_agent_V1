# Product Sense

Defines how SellGenius evaluates product value, MVP scope, and business usefulness. Agents must use this file when planning, designing, reviewing, or implementing product behavior.

## Purpose

SellGenius builds business-oriented systems. The goal is not technically impressive software, but systems that solve real business problems: improve sales processes, reduce manual work, recover lost revenue, increase conversion, and make operations more reliable.

Product decisions optimize for business value, clarity, speed to useful V1, controlled scope, reliability, user trust, and measurable outcomes.

## Product Principle

A feature is valuable only when it changes business behavior or improves a meaningful business outcome, such as:

- recovering missed leads,
- increasing response speed,
- improving sales follow-up or customer communication,
- reducing manual work or human error,
- improving visibility into performance,
- improving conversion or operational reliability,
- creating evidence for better decisions.

A feature is weak when it adds complexity, abstraction, dashboards, automation, or AI behavior without a clear business outcome.

## Sellable MVP

A sellable V1 is understandable, safe, and focused on one clear business problem, target user, workflow, and measurable outcome. It needs minimal but reliable implementation, explicit limitations, safe failure behavior, enough observability to debug, enough documentation to maintain, and enough validation to trust.

A sellable MVP does not need perfect design, every integration, advanced personalization, multi-tenant complexity, full admin or analytics suites, advanced AI memory, complex automation branching, or every future module.

## V1 / V2 / V3 Discipline

Use this default split:

- **V1:** the smallest useful version that delivers core business value safely. Include only the core workflow, required data, validation, side effects, audit/logging, tests, runtime validation, and failure handling.
- **V2:** usefulness improvements after V1 works, such as better UX, filters, integrations, analytics, configuration, personalization, and expanded automation paths.
- **V3:** scale, optimization, and advanced capability, such as multi-tenant platform behavior, advanced AI agents, complex dashboards, self-service configuration, predictive analytics, automated optimization loops, marketplace features, or SaaS packaging.

Do not put V2/V3 into V1 unless required for safety, core value, or legal/compliance reasons.

## Scope Creep Rules

Scope creep is behavior not necessary for the accepted V1 outcome. Flag it when implementation introduces extra screens, integrations, statuses, database schema, AI behavior, automation branches, analytics, user roles, configuration, abstractions, future SaaS features, or generic platform logic not needed for V1.

If scope creep is required, stop and create/report an `OPEN_DECISION`.

## Business Behavior First

Before implementation, define:

- who uses this and what problem it solves,
- what input starts the workflow,
- what output must happen,
- what state changes and side effects occur,
- what must never happen,
- how success is measured.

If business behavior is unclear, do not implement.

## Outcome Metrics

Prefer metrics tied to decisions and outcomes, for example lead response time, recovered leads, conversion rate, missed-call recovery rate, offer send rate, follow-up completion rate, manual minutes saved, order value, reply rate, failed workflow rate, duplicate side-effect rate, and time to complete workflow.

Avoid vanity-only metrics unless connected to decisions.

## AI Product Rules

AI must serve a business workflow with clear input, clear output, expected format, confidence/fallback behavior when relevant, human review when risky, parsing/validation before use, and no direct unsafe side effects from raw model output.

AI must not invent pricing, promises, discounts, customer commitments, product availability, legal statements, business rules, CRM statuses, or lifecycle transitions.

Raw LLM output is not trusted. Parse, validate, and map it into a trusted type before business execution.

## Sales Automation Rules

Sales automation must be useful and controlled. Before automating sales communication, define the target customer, message trigger, content source, personalization rules, forbidden claims, opt-out or stop conditions when relevant, retry/follow-up rules, logging/audit requirements, and human review requirement when risky.

Customer-facing messages are risky by default.

## Dashboard And Productivity Rules

Dashboards should drive action. A dashboard is useful only when it helps a user decide what to do next by answering:

- What happened?
- What changed?
- What needs attention?
- What action should I take?
- What result am I producing?
- Where am I losing money, leads, or time?

Avoid dashboards that display data without operational decisions.

## Automation Rules

Automation should remove repeatable work, not hide an unclear process. Before automating, define the manual workflow, trigger, input, decision rules, output, side effects, failure mode, human fallback, and audit trail.

If the manual process is unclear, do not automate it yet.

## User Trust

Users must understand what the system did. Important workflows should provide visible status, confirmation, audit log or history, error message, recovery path, and clear next step.

Avoid silent automation for risky behavior.

## Stop Conditions

Agents must stop when the business goal, target user, V1 scope, success metric, workflow trigger, side effects, customer-facing behavior, or AI behavior is unclear; implementation requires inventing business rules; V2/V3 leaks into V1; or risky behavior lacks security, reliability, or observability requirements.

## Review Questions

Before approving product work, ask:

- Does this solve a real business problem?
- Is the user and workflow clear?
- Is V1 small enough, with V2/V3 deferred?
- Are side effects controlled?
- Is AI output parsed before use?
- Can the user recover from failure?
- Is the outcome measurable?
- Is there enough evidence that it works?
- Would this be understandable to a buyer or operator?

## Golden Rule

Build the smallest safe system that produces real business value. Do not build impressive machinery around an unclear business process.
