# Open Decisions

This file tracks unresolved decisions that block or constrain implementation.

Agents must not resolve blocking OPEN_DECISIONs themselves.

## Rules

- Unknowns that affect architecture, business behavior, security, reliability, integrations, persistence, AI behavior, or side effects must be recorded here.
- Blocking decisions must be resolved by the Human Architect before implementation.
- Once accepted, decisions should be moved or copied to `docs/decision-log.md`.

## Open Decisions

### Blocking

None.

V1 architecture, business rules, lifecycle, integrations, and acceptance criteria are accepted via Architecture Context Pack and approved product spec.

### Non-blocking

#### OD-001 — Email provider

**Unknown:** Which transactional email provider and sending domain for V1 (SMTP, SendGrid, Resend, other).

**Why it matters:** Affects adapter implementation, webhook format for inbound replies, and DNS configuration.

**Recommended default:** Provider already used by EVAPREMIUM for operational email, wired through n8n inbound + NestJS outbound adapter.

**Impact:** email module adapter only; does not change completion policy.

---

#### OD-002 — NestJS deployment target

**Unknown:** Production hosting for NestJS (VPS, Docker, cloud PaaS, existing EVAPREMIUM infra).

**Why it matters:** Affects CI/CD, secrets management, and n8n webhook URLs.

**Recommended default:** Docker container on existing EVAPREMIUM infrastructure if available.

**Impact:** deployment and observability setup; not blocking first implementation tasks.

---

#### OD-003 — Langflow hosting

**Unknown:** Langflow instance URL, deployment model, and API authentication method for V1.

**Why it matters:** langflow module adapter configuration.

**Recommended default:** Existing EVAPREMIUM Langflow instance with API key auth.

**Impact:** integration config only.

---

#### OD-004 — Bitrix field mapping

**Unknown:** Exact Bitrix custom field IDs/names for vehicle brand, model, body type, generation, product.

**Why it matters:** DealContext parser and template matching input.

**Recommended default:** Document field map in implementation task after Bitrix MCP/schema inspection.

**Impact:** bitrix adapter mapper; blocking for production wiring only, not for schema/policy development.

---

#### OD-005 — Telegram notification target

**Unknown:** Telegram bot token storage and target chat/group ID for operator alerts.

**Why it matters:** telegram module configuration.

**Recommended default:** Single operator group chat per EVAPREMIUM ops team.

**Impact:** config only; Telegram failure is non-blocking for completion.

---

#### OD-006 — EVAMATS Excel column schema

**Unknown:** Exact column names and sheet structure for one-time import script.

**Why it matters:** template-import module parser and validation.

**Recommended default:** Import from provided EVAMATS export sample; store full row in raw_row_json.

**Impact:** template-import task; can proceed with sample file from Human Architect.

---

#### OD-007 — n8n webhook authentication

**Unknown:** Exact auth mechanism for n8n → NestJS webhooks (API key header, HMAC signature, mTLS).

**Why it matters:** Security boundary for workflow start and email ingress.

**Recommended default:** Shared secret via `X-Webhook-Secret` header validated in NestJS guard.

**Impact:** API auth module; recommended before production exposure.

