# Security

SellGenius security rules for agentic engineering. Agents must read this before planning, implementing, reviewing, fixing, or auditing risky production changes.

## Purpose

Prevent unsafe behavior, data leaks, unauthorized actions, uncontrolled side effects, and customer-facing mistakes. SellGenius touches sales processes, CRM data, customer communication, AI outputs, and business automation; these are risky by default.

## Risky Changes

Security-sensitive changes touch auth, authorization, roles, permissions, customer/CRM/production data, database migrations, secrets, API keys, payments, pricing, invoices, customer messaging, external integrations, webhooks, AI-generated business decisions, LLM workflow output, side effects, audit logs, data retention, or deletion.

Security-sensitive changes require Review. High-risk production changes require Codex Audit.

## Secrets

Never commit, log, screenshot, copy into docs/issues/tasks/prompts/reports, use in agentic/local runs, or invent real-looking secret values.

Secrets include API keys, database URLs, OAuth tokens, webhook/JWT secrets, payment/CRM/LLM keys, private certificates, and session cookies.

Use environment variables or secret managers. Secret names are allowed; values are not.

```text
OPENAI_API_KEY
DATABASE_URL
BITRIX_API_TOKEN
SMS_PROVIDER_API_KEY
```

## Production Data And PII

Do not use production data without explicit Human Architect approval. Default to mocks, fixtures, local data, sandbox accounts, or anonymized samples. If production data is required, report an `OPEN_DECISION`.

Production data/PII includes customer names, phone numbers, emails, addresses, license plates, conversation transcripts, order history/details, CRM notes, payment identifiers/information, invoices, and internal business reports.

Minimize and redact PII in logs, traces, screenshots, QA evidence, and reports. Prefer `customer_id`, `lead_id`, or `workflow_id`; do not log full phone/email/message unless explicitly required.

## Customer Messaging

Customer-facing messaging is risky: SMS, email, WhatsApp, chat, automated follow-up, AI-generated sales messages, reminders, and offers.

Before implementation, define trigger, recipient, message source, personalization rules, forbidden claims, opt-out/stop condition if relevant, approval requirement, retry behavior, audit log, and failure behavior.

Agents must not send real customer messages in tests or agentic runs. Use sandbox providers, mocks, or dry-run mode.

## AI Output Security

LLM output is untrusted until parsed and validated. It must not directly update CRM, send messages, change pricing, create commitments, assign legal/financial meaning, change lifecycle/status, write final business records, or trigger irreversible side effects.

Required flow:

```text
LLM raw output
-> parser/schema
-> trusted structured output
-> business validation
-> optional human review if risky
-> side effect
```

AI must not invent prices, discounts, availability, legal claims, customer commitments, guarantees, CRM statuses, lifecycle transitions, or business rules.

## Authorization

Every protected action needs explicit server-side or trusted-layer authorization; UI hiding is insufficient.

Protected actions include viewing/editing/exporting/deleting customer data, sending messages, changing roles, changing billing/pricing, and triggering external workflows.

## Webhooks And Integrations

Webhook handlers and external integrations must verify authenticity where possible and consider signature verification, allowed source, replay protection, idempotency key, event type validation, payload schema parsing, safe failure behavior, and audit logging.

External provider payloads must not be used directly as Domain models.

## Side Effects

Side effects may happen only after authentication/authorization where relevant, boundary parsing, validation, business rules, idempotency check if relevant, and audit context creation.

Required:

```text
parse
-> validate
-> authorize
-> check idempotency
-> execute side effect
-> log/audit result
```

External side effects before validation are forbidden.

## Payments And Pricing

Payments and pricing are high-risk. Do not implement or change them without explicit accepted requirements.

Before implementation, define pricing source of truth, calculation rules, rounding, tax/VAT if relevant, discounts, refund/cancellation behavior if relevant, payment provider behavior, audit/logging requirements, and failure/retry behavior.

Pricing/payment changes require Codex Audit.

## Database And Migrations

Database changes are risky when they affect production behavior or stored data.

Before database changes, define schema change, migration direction, rollback strategy if possible, data migration behavior, null/default handling, compatibility with existing code, test coverage, and backup/recovery expectation if production.

Do not delete or destructively transform data without explicit approval.

## Logging And Audit

Security-sensitive actions should produce audit evidence: actor, action, target entity, `workflow_id`/`request_id`, timestamp, status before/after, provider result, error code, and idempotency key where relevant.

Never include secrets or unnecessary PII.

## Testing

Security-sensitive features need unit tests for authorization/validation, integration tests for boundary parsing, negative tests for forbidden behavior, dry-run or sandbox tests for messaging/integrations, and runtime validation evidence when user-facing or side-effectful.

Tests must not use production credentials or production data.

## Codex Audit Required

Codex Audit is required for auth/security, permissions, customer messaging, CRM writes, pricing/payments, database migrations, production automation, external integrations, LLM business behavior, and customer/business-state side effects.

## Stop Conditions

Stop and report an `OPEN_DECISION` instead of guessing when secrets are required but unavailable, production data is required, authorization/customer messaging/pricing/payment/webhook authenticity/PII handling is unclear, LLM output would trigger unsafe side effects, data deletion or migration is destructive, or security requirements conflict with product requirements.

## Golden Rules

- Never commit secrets.
- Never use production credentials in agentic runs.
- Never use production customer data without approval.
- Never send real customer messages from tests.
- Never trust raw LLM output.
- Never execute side effects before validation.
- Never treat Linear as security source of truth.
- Risky changes require Review.
- High-risk production changes require Codex Audit.
