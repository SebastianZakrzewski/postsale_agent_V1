# Decision Log

This file records accepted architecture, product, security, reliability, integration, persistence, and AI behavior decisions.

## Rules

- Only accepted decisions belong here.
- Do not record guesses or unresolved questions here.
- Unresolved questions belong in `docs/open-decisions.md`.

## Accepted Decisions

### 2026-06-17 — Postsale Agent EVAPREMIUM V1 — Accepted stack

**Decision:** V1 stack is NestJS (backend owner), Supabase/PostgreSQL (source of truth), Langflow (controlled AI), n8n (Bitrix/email triggers and timers), Bitrix24 (CRM), Email (customer channel), Telegram (operator notifications).

**Rationale:** Architecture Context Pack; NestJS owns business process and side effects; Langflow and n8n are adapters only.

**Owner:** Human Architect

### 2026-06-17 — Bitrix stage mapping

**Decision:** Start stage: **Oczekiwanie na Zdjęcia**. Completed stage: **Deale do dodania**. Escalation: **Do ręcznej weryfikacji**.

**Rationale:** EVAPREMIUM CRM workflow definition.

**Owner:** Human Architect

### 2026-06-17 — Critical forbidden outcome

**Decision:** An incomplete customer reply must never be treated as complete. VALID requirement without evidence is forbidden.

**Rationale:** Core business safety rule for post-sale information collection.

**Owner:** Human Architect

### 2026-06-17 — Template import model

**Decision:** One-time controlled import of EVAMATS template base from Excel/Google Sheet into Supabase. Tables: template_import_batches, car_templates (with raw_row_json), car_template_notes.

**Rationale:** V1 scope; no scheduled sync in V1.

**Owner:** Human Architect

### 2026-06-17 — Template matching policy

**Decision:** Normalize brand/model/body/generation. Exact match first, alias second. Exactly one match → MATCHED. Zero or more than one → escalate to Do ręcznej weryfikacji. No fuzzy matching in V1.

**Rationale:** Reduce wrong-template risk; ambiguity requires human review.

**Owner:** Human Architect

### 2026-06-17 — Requirement labels and confidence

**Decision:** Langflow maps notes to YES_NO_INFO, OPTION_SELECTION, MEASUREMENT, TEXT_CONFIRMATION, PHOTO_REQUIRED. Confidence threshold 0.75. unsafe_notes → manual review/escalation. Preserve source_field, source_note, classification_reason.

**Rationale:** Structured collection with auditable classification.

**Owner:** Human Architect

### 2026-06-17 — Evidence types

**Decision:** Evidence types: TEXT_FRAGMENT, EMAIL_ATTACHMENT, EXTERNAL_LINK, MANUAL_APPROVAL. Sources: email attachments, links, text fragments, manual approval.

**Rationale:** V1 email-only channel with operator override path.

**Owner:** Human Architect

### 2026-06-17 — Follow-up policy

**Decision:** First follow-up after 24h, second after 48h, max 3 follow-ups, then escalation.

**Rationale:** Balance customer response time with operator workload.

**Owner:** Human Architect

### 2026-06-17 — Langflow boundaries

**Decision:** Langflow may classify, draft, analyze, propose, and use approved read tools. Langflow cannot send email, update Bitrix, mark complete, write Supabase, send Telegram, or create Bitrix comments directly.

**Rationale:** NestJS completion policy and side-effect control.

**Owner:** Human Architect

### 2026-06-17 — Side effect idempotency

**Decision:** Every side effect must have side_effect_record before execution. Telegram failure does not block COMPLETED if Bitrix update succeeded.

**Rationale:** Safe retries and non-blocking operator notifications.

**Owner:** Human Architect

### 2026-06-17 — WorkflowStatus vs WorkflowEventType

**Decision:** Separate enums for current workflow state (WorkflowStatus) and historical audit (WorkflowEventType). Do not reuse one enum for both.

**Rationale:** Clear state model vs audit trail.

**Owner:** Human Architect

### 2026-06-17 — Retry policy

**Decision:** Retry technical failures (Langflow timeout, email/Bitrix/Telegram temporary errors). No retry for business uncertainty (template ambiguity, unsafe notes, confidence < 0.75).

**Rationale:** Business uncertainty escalates to manual review; technical errors are transient.

**Owner:** Human Architect

### 2026-06-17 — NestJS module ownership

**Decision:** Modules: postsale-workflows, template-import, template-matching, requirements, langflow, email, bitrix, telegram, audit, idempotency, side-effects. Pattern: Controller → UseCase → Service/Policy → Repository/Integration.

**Rationale:** Aligns with ARCHITECTURE.md domain layers.

**Owner:** Human Architect

### 2026-06-17 — V1 exclusions

**Decision:** V1 excludes image correctness classification, customer upload portal, scheduled template sync, multi-agent architecture, admin dashboard, fuzzy matching, microservices, CQRS/event sourcing.

**Rationale:** Controlled V1 scope for stable delivery.

**Owner:** Human Architect

### 2026-06-17 — Product spec approval

**Decision:** Product spec `docs/product-specs/postsale-agent-v1.md` approved as implementation source of truth for V1.

**Rationale:** Architecture Context Pack Stages 1–7 complete; Human Architect acceptance.

**Owner:** Human Architect

### 2026-06-17 — OD-008 stack.env activation timing

**Decision:** `.harness/stack.env` is activated to the NestJS profile in task-01 after the NestJS scaffold and `package.json` landed.

**Rationale:** Task-01 established the Node/NestJS project foundation, so CI can require Node checks, lint, typecheck, tests, and build.

**Owner:** Human Architect

### 2026-06-18 — OD-004 Bitrix DealContext field mapping (EVAPREMIUM)

**Decision:** DealContext parser maps Bitrix deal custom fields on `evapremium.bitrix24.pl` as follows: brand → `UF_CRM_1760788285332`, model → `UF_CRM_1760788302371`, bodyType → `UF_CRM_1760788343011`, generation → `UF_CRM_1768256762509`, product → `UF_CRM_1781552572183`. Generation uses the dedicated “Generacja” field (not “Rok samochodu”). Product uses the string field “Rodzaj kompletu (tech):”, not the legacy enumeration-only field.

**Rationale:** Confirmed via live REST inspection of deal `33950` (`crm.deal.get`, `crm.deal.userfield.list`). Required for live Bitrix read before template matching.

**Owner:** Human Architect (empirical confirmation 2026-06-18; formal sign-off pending if needed)

### 2026-06-19 — OD-011 Identical duplicate template resolution

**Decision:** Option 3 — both persistence and code. One-time PROD dedup of identical `car_templates` match keys (notes merged to survivor row; ~76 duplicate rows removed in task-13 Iteration 3). Deterministic tie-breaker in `resolveUniqueTemplateMatch` when multiple rows share the same persistence key `(brand, model, body_type, generation)` — lowest `id` wins. Import path must guard against re-introducing duplicate keys.

**Rationale:** Resolves ~39 audited AMBIGUOUS deals from duplicate import rows; tie-breaker is safety net if duplicates reappear. Does not merge non-identical candidates (different persistence keys remain AMBIGUOUS).

**Evidence:** task-13 Iterations 1 + 3; arithmetic mean hit rate 93.3% (≥ 90% acceptance).

**Owner:** Human Architect (accepted 2026-06-19)

### 2026-06-19 — OD-012 Cross-variant template aliases

**Decision:** `car_templates.aliases` may map CRM keys to templates when they represent the same physical template. Trim/model suffix aliases are allowed (e.g. `pacifica_ru_2_gen_limited` → `pacifica_ru_2_gen`). Body-type aliases (e.g. CRM `hatchback` → DB `hatchback_3_door`, CRM `suv` → DB `suv_7_seater`) are allowed only when `car_template_notes` for the deal's normalized `product` are identical across the aliased variants — verified per alias before PROD DML. `SelectNotesUseCase` must still resolve notes correctly for the deal's body type.

**Rationale:** Fixes NOT_FOUND near-misses without new EVAMATS rows; body-type aliasing restricted to prevent wrong product notes for a body variant.

**Evidence:** task-13 Iteration 4 alias/slug DML on PROD; benchmark regression gate passed.

**Owner:** Human Architect (accepted 2026-06-19)

### 2026-06-23 — Remove car template persistence (code + schema)

**Decision:** Fully remove EVAMATS template matching and notes from V1 application and Supabase schema: delete `template-import` and `template-matching` modules, Bitrix product→note slug mapping, audit/import scripts, `CarTemplateRepository`, and tables `car_templates`, `car_template_notes`, `template_import_batches`; drop `postsale_workflows.car_template_id`. `MatchWorkflowTemplateUseCase` stub returns `template_mapping_not_implemented` only.

**Rationale:** Human Architect — prior matcher/notes implementation and PROD template base discarded; clean slate before any future redesign.

**Impact:** All workflow starts escalate on match step. **task-05 blocked (OD-015).** task-14 and task-15 cancelled. Historical task-11 PROD load superseded by manual DROP (migration `supabase/migrations/20260623120000_drop_car_templates.sql`).

**Owner:** Human Architect
