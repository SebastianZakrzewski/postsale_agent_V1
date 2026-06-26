# Open Decisions

This file tracks unresolved decisions that block or constrain implementation.

Agents must not resolve blocking OPEN_DECISIONs themselves.

## Rules

- Unknowns that affect architecture, business behavior, security, reliability, integrations, persistence, AI behavior, or side effects must be recorded here.
- Blocking decisions must be resolved by the Human Architect before implementation.
- Once accepted, decisions should be moved or copied to `docs/decision-log.md`.

## Open Decisions

_No blocking open decisions._ Resolved OD-015 (2026-06-24) — see `docs/decision-log.md` and `docs/references/template-matching-validation.md`.

### Non-blocking (resolved archive)

#### OD-015 — Requirements input after template persistence removal

**Status:** Resolved (2026-06-24). Moved to `docs/decision-log.md`. Evidence: `src/domains/template-matching/`, `docs/references/template-matching-validation.md`.

---

### Non-blocking

#### OD-001 — Email provider

**Status:** Partially resolved (2026-06-25). Provider: **Gmail**. Integration: **n8n** owns send + receive; NestJS does not call Gmail API. See `docs/decision-log.md` (2026-06-25 — Email channel: Gmail via n8n).

**Still open (non-blocking):** Gmail sending address/domain; n8n workflow URLs/IDs for send and inbound forward; attachment `contentRef` fetch/storage; inbound DTO contract is defined in decision-log — n8n workflows must emit that shape.

**Why it mattered:** Adapter implementation, inbound webhook format, DNS/OAuth (in n8n).

**Impact:** `EmailProvider` → n8n HTTP for outbound; `inbound-email.parser.ts` → canonical n8n DTO for inbound (task-06).

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

**Status:** Resolved for `evapremium.bitrix24.pl` (2026-06-18). Production wiring may proceed using the mapping below. Re-open only if Bitrix admin renames custom fields or portal differs.

**Confirmed mapping** (source: `crm.deal.get` + `crm.deal.userfield.list`, deal `33950`):

| DealContext | Bitrix `FIELD_NAME` | Bitrix label (PL) |
|-------------|---------------------|-------------------|
| brand | `UF_CRM_1760788285332` | Marka samochodu |
| model | `UF_CRM_1760788302371` | Model samochodu |
| bodyType | `UF_CRM_1760788343011` | Typ nadwozia |
| generation | `UF_CRM_1768256762509` | Generacja |
| product | `UF_CRM_1781552572183` | Rodzaj kompletu (tech): |

**Runtime config:** `BITRIX_DEAL_FIELD_MAP` JSON in `.env` (see `.env.example`). Code default matches the table above.

**Notes:** Legacy fields `UF_CRM_CAR_*` and combined `UF_CRM_1757178018809` exist but were empty on deal `33950`; do not use for DealContext. Product enum `UF_CRM_1757024835301` duplicates product text; string field above is the parser source of truth.

**Impact:** bitrix adapter mapper — resolved for EVAPREMIUM V1 live read path.

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

---

#### OD-008 — Agent loop runtime ownership

**Unknown:** Where the **workflow-wide** agent decision loop (level B) runs: inside Langflow flows only, inside NestJS as a `RunAgentTurn`-style use case, or in an external parent agent (MCP / Cursor / dedicated orchestrator).

**Why it matters:** Determines API surface, deployment boundaries, observability, and who owns retry/timeout for the loop. V1 already assumes **task-local** loops inside Langflow for classify/draft/analyze (level A); this decision is about orchestration **across** workflow steps.

**Recommended default:**

- **V1:** Level A only — Langflow loops within AI steps; NestJS deterministic use cases between steps (see `docs/design-docs/postsale-agent-langflow-tools.md`).
- **V2:** NestJS exposes discrete **capabilities** (HTTP or internal); optional recovery/replay without a full `start_workflow`.
- **V3:** External or NestJS-hosted level B loop calling capabilities + Langflow propose tools; see `docs/design-docs/postsale-agent-capabilities-agent-loop.md`.

**Impact:** Non-blocking for V1 task-05–09. Blocks V3 multi-agent ExecPlan and any MCP/agent API design.

**Design reference:** `docs/design-docs/postsale-agent-capabilities-agent-loop.md`

---

#### OD-009 — Workflow capability decomposition

**Unknown:** When and how to split `StartWorkflowUseCase` into externally invokable capabilities (`load_deal_context`, `match_template`, …) with `WorkflowStateGuard` preconditions; whether `start_workflow` remains the only n8n entry in production indefinitely.

**Why it matters:** Enables agent loop (level B) and operator recovery without re-running full start. Without decomposition, every agent action implies duplicate idempotency + Bitrix read + match.

**Recommended default:**

1. Implement task-05+ as **standalone use cases**, not new branches inside `StartWorkflowUseCase`.
2. After task-04 merge, extract **`LoadDealContextUseCase`** from start; keep `StartWorkflowUseCase` as thin orchestrator for n8n.
3. Add **`WorkflowStateGuard`** and **`allowed_next_actions`** when first exposing capability HTTP/MCP (V2).
4. Production n8n continues **`start_workflow` only** until Human Architect approves agent-driven entry.

**Impact:** Non-blocking for V1. Guides refactor hygiene during task-05–08. See capability map in design doc.

**Design reference:** `docs/design-docs/postsale-agent-capabilities-agent-loop.md`

---

#### OD-013 — Missing EVAMATS row supplementation

**Unknown:** Who adds `car_templates` rows for true NOT_FOUND models (e.g. Captur 2 gen, Audi Q3 FJ 3 gen, Golf MK7, C-HR) and whether partial re-import is in V1 scope.

**Why it matters:** Code and aliases cannot fix absent templates; FINAL_INVOICE needs ~15+ rows to reach 90% if duplicate fixes alone are insufficient.

**Recommended default:** Human Architect provides updated EVAMATS export; one-time controlled DML via task-11-style script (task-13 Iteration 5 optional).

**Impact:** Non-blocking for starting task-13 Iterations 1–4; blocking for guaranteed 90% if NOT_FOUND count remains high after dedup + aliases.

---

#### OD-014 — Template notes hit-rate acceptance floor (task-14)

**Status:** Superseded — task-14 **Cancelled** 2026-06-19 (Human Architect: no Bitrix product/set-variant notes mapping). Legacy single-product `TemplateNotesService` retained; notes hit-rate floor no longer gates delivery.

**Unknown (if notes mapping revived):** Minimum five-stage **notes** arithmetic mean for task-14 acceptance after Bitrix product/set-variant mapping (baseline **16.0%** on 2026-06-19 full audit; template mean **94.5%** same run).

**Why it matters:** Remaining gaps may be mapping bugs or missing `car_template_notes` rows (OD-013).

**Recommended default:** **≥ 60%** notes arithmetic mean on live `batch-stage-full-audit.ts`; template mean must stay **≥ 90%** (task-13 regression).

**Impact:** Non-blocking while task-14 cancelled.

---

#### OD-010 — Agent loop termination and capability response contract

**Unknown:** Exact API response shape for agent-facing capability calls: fields for `done`, `soft_stop`, `allowed_next_actions[]`, and rejection reasons when `propose_completion` or mutating capabilities are denied.

**Why it matters:** Agent loops need deterministic stop conditions. Without an explicit contract, agents may retry forbidden tools or fail to stop on `WAITING_FOR_CUSTOMER_REPLY`.

**Recommended default:**

- **Hard stop:** `status ∈ { COMPLETED, ESCALATED, FAILED }` → `done: true`.
- **Soft stop:** `WAITING_FOR_CUSTOMER_REPLY` → `done: false`, `soft_stop: true` (resume on webhook/timer).
- Every mutating capability returns current `status` + `allowed_next_actions[]` derived from `WorkflowStateGuard`.
- Langflow **proposal** rejections return policy reason; agent continues with read tools or controlled requests.

**Impact:** Non-blocking for V1. Required before V2 agent/MCP exposure or level B loop.

**Design reference:** `docs/design-docs/postsale-agent-capabilities-agent-loop.md`

