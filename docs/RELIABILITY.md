# Reliability

Reliability defines SellGenius rules for predictable agentic engineering under real-world failure. Agents must read this before planning, implementing, reviewing, fixing, or auditing workflows, integrations, side effects, production automation, customer messaging, CRM writes, and LLM-driven business behavior.

## Purpose And Principle

SellGenius workflows must handle retries, timeouts, duplicated events, provider failures, partial failures, invalid external payloads, missing data, races, repeated agent runs, interruptions, and unsafe duplicate side effects. A workflow is not reliable if it only works once on a perfect happy path.

Default flow:

```text
parse
-> validate
-> authorize
-> check idempotency
-> execute side effect
-> record result
-> expose recovery path
```

Do not execute irreversible side effects before validation and idempotency checks.

## Risky Workflows

Reliability-sensitive workflows require explicit reliability behavior: CRM writes, customer messages, offer generation, lead/order status changes, payment operations, pricing calculations, webhooks, LLM classification, scheduled automations, background jobs, external API integrations, n8n workflows, and production data migrations.

Codex Audit is required when reliability-sensitive work touches CRM writes, customer messaging, payments/pricing, database migrations, production automation, external integrations, webhooks, LLM business behavior, status/lifecycle transitions, or irreversible side effects.

## Idempotency

Idempotency means repeated execution must not create duplicate unsafe effects. It is required for customer messaging, CRM writes, payment operations, webhook handling, status transitions, offer generation, background jobs, scheduled tasks, and retryable external integrations.

Define: idempotency key, uniqueness boundary, duplicate detection behavior, safe repeated result, audit/log event, and failure behavior.

Example keys: `lead_id + message_type + workflow_id`, `external_event_id`, `order_id + transition_type`, `customer_id + offer_id`, `provider_event_id`.

Forbidden: retries that send duplicate SMS, create duplicate CRM notes, charge twice, or change status twice with conflicting history.

## Retry Rules

Retries must be explicit and safe. Before implementing, define: operation eligibility, max attempts, delay/backoff, timeout per attempt, retryable and non-retryable errors, final failure state, audit/log behavior, and whether retry can duplicate a side effect.

Retry only safe-to-repeat operations. Do not retry blindly when the operation may have already succeeded externally. If provider result is unknown, prefer reconciliation before repeating risky side effects.

Retryable: temporary provider timeout; network failure before confirmed side effect; rate-limited request where provider confirms no execution; safe read.

Non-retryable or dangerous: customer message with unknown send status; payment with unknown charge status; CRM write with unknown result; status transition that may already have happened.

Required pattern:

```text
classify error
-> check idempotency
-> decide retry eligibility
-> retry safely or record final failure
-> expose recovery path
```

## Timeouts

External calls must define timeout duration/policy, post-timeout behavior, whether retry is allowed, whether state remains pending, whether human review is required, and how timeout is logged.

Forbidden: workflows that wait forever, timeouts that trigger unsafe duplicate side effects, and silently swallowed timeouts.

## Failure And Partial Failure

Every important workflow must define failure behavior: fail closed, fail open, pending manual review, retry later, safe rollback, compensation, failed state recording, operator notification, or skipping unsafe side effects. Risky workflows default to fail closed or manual review. Do not silently continue after uncertain side-effect failure.

For multiple side effects, define execution order, source of truth, how partial completion is recorded, whether compensation is possible, whether retry resumes from the last safe step, and how the operator sees the issue.

Example partial failure: CRM status updated, SMS failed, audit event missing.

## State Transitions

State transitions must define allowed states, allowed/forbidden transitions, owner, trigger, audit event, and recovery state.

Forbidden: adapters deciding status transitions, LLMs directly deciding lifecycle state, or UI changing lifecycle state without a use case.

Preferred flow:

```text
use case
-> validates transition
-> executes side effect
-> records audit event
```

## Webhooks, Jobs, And Automations

Webhook handlers must parse external payloads before use and handle duplicate events, out-of-order events, missing fields, invalid signatures where applicable, stale events, provider retries, unknown event types, provider outage, and partial processing. Webhook processing must be idempotent.

Background jobs must define schedule/trigger, idempotency key, batch size if relevant, retry behavior, timeout behavior, lock/concurrency behavior if relevant, progress tracking, failure state, and operator visibility. Scheduled automations must not create repeated duplicate customer actions.

## LLM Reliability

LLM behavior must handle invalid output, missing fields, low confidence, hallucinated values, timeout, provider error, inconsistent classification, unsafe recommendation, and parser failure.

Required flow:

```text
prompt/input
-> LLM raw output
-> parser/schema
-> trusted structured output
-> business validation
-> fallback/manual review if unsafe
-> side effect only if allowed
```

LLM output must not be the only control for risky side effects.

## Data Consistency And Recovery

For workflows that write data, define source of truth, write order, transaction boundary if available, consistency expectation, duplicate prevention, reconciliation behavior, and rollback/compensation if relevant. If strong consistency is not possible, document eventual consistency and user-visible implications.

Every risky workflow should expose recovery: retry from failed step, manual review queue, operator notification, reconciliation job, audit inspection, safe rollback, status correction, or reprocessing with the same idempotency key. Do not leave failed workflows invisible.

## Runtime Validation

Reliability-sensitive work usually requires runtime validation evidence: retry test, duplicate event test, timeout test, idempotency test, provider failure simulation, sandbox integration test, structured log/audit event, trace/request/workflow ID, and recovery path test.

Review must check idempotency strategy, retry behavior, timeout behavior, failure modes, partial failure handling, state transitions, side-effect order, recovery path, runtime validation evidence, observability evidence, and Codex Audit requirement.

## Stop Conditions

Agents must stop and create/report an `OPEN_DECISION` instead of guessing when idempotency is required but undefined, retry behavior is unclear, timeout behavior is unclear, failure mode is unclear, state transitions are undocumented, partial failure could corrupt business state, repeated execution may duplicate side effects, external provider behavior is unknown, recovery path is missing for a risky workflow, or runtime validation cannot prove reliability-sensitive behavior.

## Golden Rules

- No unsafe duplicate side effects.
- No blind retries for risky operations.
- No side effects before validation.
- No silent failures.
- No hidden partial failures.
- No raw LLM output controlling side effects.
- Every risky workflow needs idempotency.
- Every external call needs timeout behavior.
- Every important failure needs visible recovery.
