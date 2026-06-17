# Observability

SellGenius observability rules for agentic engineering. Agents must read this before planning, implementing, reviewing, fixing, or auditing workflows, integrations, side effects, customer messaging, CRM writes, LLM-driven business behavior, or production automation.

## Purpose And Principle

Observability exists to make system behavior inspectable. SellGenius systems must make it possible to answer what happened, when, why, who or what triggered it, what data/entity was affected, which external provider was called, whether the operation succeeded, what failed, whether retry is safe, and what the operator should do next.

A workflow that cannot be inspected cannot be trusted. Important business workflows must produce structured evidence.

Default flow:

```text
request/event/trigger
-> workflow_id/request_id
-> parsed input
-> business decision
-> side effect
-> result
-> audit/log/trace
-> visible status or recovery path
```

Do not rely only on console logs or screenshots.

## Required For Risky Workflows

Observability is required for CRM writes, customer messaging, pricing/payments, database migrations, external integrations, webhook processing, LLM classification, offer generation, lead recovery, lifecycle/status transitions, production automation, background jobs, n8n workflows, and user-facing AI behavior.

## Correlation IDs

Important workflows should use consistent correlation identifiers across logs, audit events, traces, and QA evidence where practical. Recommended fields: `workflow_id`, `request_id`, `operation_id`, `trace_id`, `idempotency_key`, `external_event_id`, `provider_result_id`, `linear_issue_id`, and `repo_task_id`.

## Structured Logs

Important operations should use structured logs with fields such as `event_name`, `workflow_id`, `request_id`, `operation_id`, `entity_type`, `entity_id`, `actor_type`, `actor_id`, `status`, `error_code`, `retry_allowed`, `idempotency_key`, `provider`, `provider_result_id`, and `duration_ms`.

Avoid unstructured messages such as `it worked`, `failed here`, or `bad response`. Do not log secrets or unnecessary PII.

## Audit Events

Audit events are required when business state or customer-facing behavior changes, including message prepared/sent, CRM status updated, offer generated, lead classified, payment attempted, workflow failed, manual review required, retry scheduled, or recovery completed.

Audit events should include where relevant: actor, action, target entity, `workflow_id`, `request_id`, `status_before`, `status_after`, `decision_reason`, `idempotency_key`, provider, `provider_result_id`, `error_code`, and timestamp.

## LLM Observability

LLM-driven behavior must be inspectable without exposing sensitive data. Track model/provider, prompt or template version, input category, output parser version, parse success/failure, confidence if available, fallback path, human review requirement, final trusted output type, and whether side effects were allowed or blocked.

Do not store raw sensitive prompts or raw customer data unless explicitly approved. Raw LLM output must not be treated as trusted audit evidence.

## Integration Observability

External integration calls should expose provider, operation, target entity, request/operation ID, provider result ID, status, retry eligibility, timeout result, error code, and recovery state.

Do not log full provider payloads unless sanitized.

## Customer Messaging Observability

Customer messaging must be auditable. Track message type, trigger, recipient entity ID, template/version, personalization source, approval state if relevant, send status, provider result ID, retry state, failure reason, and opt-out/stop condition if relevant.

Do not log full message bodies containing PII unless explicitly required and approved.

## Runtime Evidence

Runtime validation evidence must be linked from the task, PR, QA report, or ExecPlan. Evidence may include test output, Playwright result, screenshot, DOM snapshot, API response, network check, no-console-error check, sandbox/mock integration result, structured log sample, audit event sample, trace/request/workflow ID, and idempotency proof.

Evidence must show changed behavior, not only that code compiled.

## Dashboard And Operator Visibility

Important workflows should expose useful operator-facing status when relevant: what is pending, what succeeded, what failed, what needs manual review, what can be retried, what must not be retried, what was sent or changed, and where to inspect details.

Avoid silent automation for risky workflows.

## Error Handling

Errors must be observable and actionable. Good error records include stable error code, user-safe message if applicable, internal reason, `workflow_id`/`request_id`, retry eligibility, recovery instruction, provider if external, and timestamp.

Avoid swallowing errors silently.

## Review Requirements

Review must check that required logs/audit events exist, correlation IDs are present where needed, PII/secrets are not logged, runtime evidence is linked, errors are actionable, risky side effects are auditable, LLM behavior is traceable through parser/validation/fallback, and observability matches Security and Reliability requirements.

## Codex Audit Required

Codex Audit is required when observability-sensitive work touches CRM writes, customer messaging, pricing/payments, auth/security, production automation, external integrations, webhooks, LLM business behavior, lifecycle/status transitions, or irreversible side effects.

## Stop Conditions

Agents must stop and create/report an `OPEN_DECISION` instead of guessing when a risky workflow has no audit/log plan, no required workflow/request/idempotency identifier exists, customer messaging cannot be audited, CRM writes cannot be traced, LLM output cannot be parsed and inspected, failure cannot be diagnosed, runtime evidence cannot be collected, logging would expose secrets or unnecessary PII, or observability requirements conflict with product/security/reliability requirements.

## Golden Rules

- No invisible risky workflows.
- No silent failures.
- No secrets in logs.
- No unnecessary PII in logs.
- Every important side effect needs audit evidence.
- Every retryable workflow needs correlation/idempotency evidence.
- Runtime evidence must prove behavior, not only compilation.
- Operators should know what happened and what to do next.
