# Design Doc: Postsale Agent EVAPREMIUM V1 — AI, Security, Observability, Testing

Status: Accepted
Owner: Human Architect
Created: 2026-06-17
Last updated: 2026-06-17

Linked product spec: `docs/product-specs/postsale-agent-v1.md`
Linked ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`

Readiness: AI_SECURITY_OBSERVABILITY_TESTING_READY

Also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`

## AI Usage Boundaries (V1)

| Allowed | Forbidden |
| --- | --- |
| Classify notes, draft emails, analyze replies | Langflow sends email or updates Bitrix |
| Propose completion / follow-up / manual review | Langflow writes Supabase or marks complete |
| Approved read tools | Raw LLM output → persistence |
| Light question_text rewrite (preserve meaning) | Bypass confidence threshold 0.75 |

## Security

- No secrets in repo or logs.
- Credentials via environment / secret store only.
- n8n → NestJS webhook authentication required.
- PII redacted in logs and test artifacts.
- All outbound email passes NestJS validation after Langflow draft.
- Bitrix writes require side_effect_record + idempotency.
- Codex Audit required for V1 (CRM + messaging + LLM).

## Reliability

### Idempotency

- Workflow start: idempotency_key per deal + trigger type.
- Side effects: side_effect_record status (pending → succeeded / failed).
- Duplicate Bitrix trigger must not create second workflow.

### Retry

Technical only: Langflow timeout, email/Bitrix/Telegram temporary failures (max ~3 retries, configurable).

No retry for business uncertainty.

### Telegram non-blocking

Bitrix completion success + Telegram failure → workflow may still reach COMPLETED.

## Observability

Correlation IDs: workflow_id, request_id, idempotency_key, langflow_run_id, side_effect_record_id, provider_message_id, bitrix_deal_id.

### Runtime evidence (required)

| Evidence | When |
| --- | --- |
| workflow_event | state transitions |
| side_effect_record | before each side effect |
| langflow_run | every Langflow invocation |
| provider_message_id | email sent |
| Bitrix response payload | stage update / comment |
| Telegram response/error | notification attempt |
| evidence record | requirement_evidence created |

Runtime Validation: YES

## Testing — V1 Baseline (15 cases)

1. duplicate Bitrix trigger → no second workflow
2. template not found → escalate
3. ambiguous template → escalate
4. unsafe Langflow notes → escalate
5. no initial email before requirements created
6. unmatched reply → escalate
7. VALID without evidence → rejected
8. incomplete requirements → no completion
9. complete requirements → Bitrix Deale do dodania
10. Bitrix failure → COMPLETED blocked
11. follow-up only when requirements missing
12. max 3 follow-ups → escalation
13. Telegram failure does not block completion
14. direct side-effect Langflow tools forbidden
15. confidence < 0.75 → rejected

### Test layers

Unit (policies, parsers), integration (repos + mocked adapters), policy (cases 1–15), contract (Langflow schemas, n8n DTOs).

## Codex Audit

Required: YES — CRM writes, customer email, LLM behavior, integrations, lifecycle transitions.

## Residual Risks

- Langflow prompt drift → schema validation + confidence gate + langflow_runs audit
- Email reply matching ambiguity → escalate when unmatched
- EVAMATS import quality → batch validation review
- n8n timer drift → NestJS enforces max follow-up count
