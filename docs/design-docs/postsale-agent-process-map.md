# Design Doc: Postsale Agent EVAPREMIUM V1 — Process Map

Status: Accepted
Owner: Human Architect
Created: 2026-06-17
Last updated: 2026-06-17

Linked product spec: `docs/product-specs/postsale-agent-v1.md`
Linked ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`

Readiness: BUSINESS_PROCESS_MAPPING_READY

## Actors

| Actor               | Role                                                         |
| ------------------- | ------------------------------------------------------------ |
| Bitrix24            | CRM source; deal stage trigger; completion/escalation target |
| n8n                 | Bitrix/email webhooks; follow-up timers; forwards to NestJS  |
| NestJS backend      | Business process owner; validation; policies; side effects   |
| Supabase/PostgreSQL | Source of truth for workflows, requirements, evidence, audit |
| Langflow            | Controlled AI module: classify, draft, analyze, propose      |
| Email provider      | Customer communication channel                               |
| Customer            | Replies with text, attachments, links                        |
| Telegram            | Operator notification channel                                |
| Operator            | Manual review in Bitrix when escalated                       |

## End-to-End Flow

```text
Bitrix (Oczekiwanie na Zdjęcia)
  → n8n trigger
  → NestJS (idempotency)
  → Supabase workflow created
  → context load (Bitrix)
  → template match (Supabase EVAMATS)
  → note selection (product + body type)
  → Langflow classify notes
  → NestJS validate + persist requirements
  → Langflow draft initial email
  → NestJS validate + send email
  → WAITING_FOR_CUSTOMER_REPLY
  → n8n email reply webhook
  → NestJS match reply + store message/evidence inputs
  → Langflow analyze reply
  → NestJS validate + store evidence + update requirements
  → completion policy
     ├─ complete → Bitrix Deale do dodania + comment + Telegram → COMPLETED
     ├─ incomplete → Langflow follow-up draft → send → WAITING_FOR_CUSTOMER_REPLY
     └─ unsafe/max follow-ups/failure → Bitrix Do ręcznej weryfikacji + comment + Telegram → ESCALATED
```

## Step Mapping

### Step 1 — Deal enters post-sale stage

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| Actor               | Bitrix24                                                                           |
| Trigger             | Deal stage → **Oczekiwanie na Zdjęcia**                                            |
| Input               | deal_id, stage change event                                                        |
| Decision            | Is this a new post-sale collection start?                                          |
| Output              | n8n webhook payload to NestJS                                                      |
| State change        | None in Supabase yet                                                               |
| Side effect         | n8n HTTP call to NestJS                                                            |
| Audit               | n8n execution log; later WORKFLOW_STARTED                                          |
| Failure             | n8n retry; NestJS unavailable → n8n retry policy                                   |
| Recovery            | Idempotent re-delivery safe at NestJS                                              |
| Owner               | n8n (transport), NestJS (business)                                                 |
| Given / When / Then | Given deal in start stage, When n8n fires, Then NestJS receives normalized trigger |

### Step 2 — Workflow start and idempotency

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                 |
| Trigger             | POST from n8n (workflow start)                                                         |
| Input               | bitrix_deal_id, idempotency_key                                                        |
| Decision            | Duplicate trigger?                                                                     |
| Output              | New workflow OR ignored duplicate                                                      |
| State change        | postsale_workflows: STARTED → …                                                        |
| Side effect         | Supabase insert (workflow, idempotency_keys)                                           |
| Audit               | WORKFLOW_STARTED, idempotency_keys record                                              |
| Failure             | DB error → retryable technical failure                                                 |
| Recovery            | Same idempotency_key → no second workflow                                              |
| Owner               | NestJS postsale-workflows + idempotency modules                                        |
| Given / When / Then | Given same deal trigger twice, When second arrives, Then no second workflow is created |

### Step 3 — Load deal context

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                |
| Trigger             | Workflow created                                                                      |
| Input               | bitrix_deal_id                                                                        |
| Decision            | Sufficient vehicle/customer/product data?                                             |
| Output              | Normalized deal context Command                                                       |
| State change        | CONTEXT_LOADED                                                                        |
| Side effect         | Bitrix read API                                                                       |
| Audit               | DEAL_CONTEXT_LOADED                                                                   |
| Failure             | Missing vehicle data → escalation path                                                |
| Recovery            | Escalate; do not guess vehicle fields                                                 |
| Owner               | NestJS bitrix + postsale-workflows                                                    |
| Given / When / Then | Given insufficient vehicle data, When context load runs, Then escalation is initiated |

### Step 4 — Template matching

> **Current runtime (2026-06-24):** Implemented via `template-matching` domain — `TemplateMatchingService` cascade + `MatchWorkflowTemplateUseCase`. Temporarily removed 2026-06-23; restored per OD-015. Validation: `docs/references/template-matching-validation.md`.

| Field               | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                  |
| Trigger             | Context loaded                                                                          |
| Input               | brand, model, body, generation (normalized)                                             |
| Decision            | 0 / 1 / many template matches?                                                          |
| Output              | MATCHED template OR escalation                                                          |
| State change        | TEMPLATE_MATCHED or escalation pending                                                  |
| Side effect         | Supabase read car_templates                                                             |
| Audit               | TEMPLATE_MATCH_SUCCEEDED or escalation event                                            |
| Failure             | 0 matches → escalate; >1 → escalate                                                     |
| Recovery            | Manual review in Bitrix                                                                 |
| Owner               | NestJS template-matching                                                                |
| Given / When / Then | Given ambiguous templates, When match runs, Then Bitrix moves to Do ręcznej weryfikacji |

### Step 5 — Note selection

> **Current runtime (2026-06-24):** `TemplateNoteSelectionService` maps Bitrix product + set variant to wide-table `notes_*` columns. Empty cells are not an error (OD-015). Zero notes still allows task-05 classification.

| Field               | Value                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                          |
| Trigger             | Template matched                                                                                |
| Input               | car_template_id, product, body type                                                             |
| Decision            | Which notes apply to this deal?                                                                 |
| Output              | Selected template notes list                                                                    |
| State change        | None (pre-classification)                                                                       |
| Side effect         | Supabase read `car_templates` wide `notes_*` columns                                            |
| Audit               | Log selected note column keys                                                                   |
| Failure             | Stage 1 ambiguity → escalate; Stage 2 empty notes → success (zero notes OK)                     |
| Recovery            | Escalation                                                                                      |
| Owner               | NestJS template-matching / requirements                                                         |
| Given / When / Then | Given product + body type, When selection runs, Then only relevant notes are passed to Langflow |

### Step 6 — Langflow classification

| Field               | Value                                                             |
| ------------------- | ----------------------------------------------------------------- |
| Actor               | Langflow (via NestJS)                                             |
| Trigger             | Selected notes ready                                              |
| Input               | Selected notes, workflow context                                  |
| Decision            | Label + confidence + unsafe_notes?                                |
| Output              | Parsed LLM Output → requirement label proposals                   |
| State change        | REQUIREMENTS_CREATED (after persist)                              |
| Side effect         | Langflow API call; langflow_runs insert                           |
| Audit               | REQUIREMENTS_CLASSIFIED, langflow_run record                      |
| Failure             | confidence < 0.75 or unsafe_notes → escalate                      |
| Recovery            | No retry for business uncertainty                                 |
| Owner               | NestJS langflow + requirements (validation owner)                 |
| Given / When / Then | Given unsafe_notes, When validation runs, Then workflow escalates |

### Step 7 — Persist requirements

| Field               | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                       |
| Trigger             | Valid classification                                                                         |
| Input               | Validated requirement Commands                                                               |
| Decision            | All required fields present?                                                                 |
| Output              | workflow_requirements rows                                                                   |
| State change        | REQUIREMENTS_CREATED                                                                         |
| Side effect         | Supabase write                                                                               |
| Audit               | WORKFLOW_REQUIREMENTS_CREATED                                                                |
| Failure             | Validation error → escalate                                                                  |
| Recovery            | Do not send customer email until requirements exist                                          |
| Owner               | NestJS requirements                                                                          |
| Given / When / Then | Given invalid Langflow output, When persist attempted, Then no requirements row and no email |

### Step 8 — Initial customer email

| Field               | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Actor               | NestJS (send), Langflow (draft)                                                          |
| Trigger             | Requirements persisted                                                                   |
| Input               | workflow context, requirements                                                           |
| Decision            | Draft valid?                                                                             |
| Output              | outgoing_messages + email sent                                                           |
| State change        | WAITING_FOR_CUSTOMER_REPLY                                                               |
| Side effect         | SEND_INITIAL_EMAIL (side_effect_record first)                                            |
| Audit               | INITIAL_EMAIL_SENT, provider_message_id                                                  |
| Failure             | Email provider temp failure → retry                                                      |
| Recovery            | Idempotent send via side_effect_record                                                   |
| Owner               | NestJS email + langflow                                                                  |
| Given / When / Then | Given requirements not yet created, When initial email requested, Then send is forbidden |

### Step 9 — Customer reply ingestion

| Field               | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| Actor               | n8n → NestJS                                                |
| Trigger             | Inbound email webhook                                       |
| Input               | email body, attachments, headers                            |
| Decision            | Match to workflow?                                          |
| Output              | customer_messages, message_attachments, message_links       |
| State change        | REQUIREMENTS_UPDATED (after analysis)                       |
| Side effect         | Supabase writes                                             |
| Audit               | CUSTOMER_REPLY_RECEIVED                                     |
| Failure             | No workflow match → escalate                                |
| Recovery            | Operator manual review                                      |
| Owner               | NestJS email + postsale-workflows                           |
| Given / When / Then | Given unmatched reply, When ingestion runs, Then escalation |

### Step 10 — Reply analysis and evidence

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Actor               | Langflow (analyze), NestJS (validate)                                                  |
| Trigger             | Reply stored                                                                           |
| Input               | Reply content, requirements, prior evidence                                            |
| Decision            | Which requirements satisfied? Evidence valid?                                          |
| Output              | requirement_evidence, updated requirement statuses                                     |
| State change        | REQUIREMENTS_UPDATED                                                                   |
| Side effect         | Langflow call; Supabase writes                                                         |
| Audit               | REPLY_ANALYSIS_ACCEPTED, REQUIREMENT_STATUSES_UPDATED                                  |
| Failure             | Invalid analysis → escalate or follow-up                                               |
| Recovery            | Never mark VALID without evidence                                                      |
| Owner               | NestJS requirements + langflow                                                         |
| Given / When / Then | Given partial reply, When analysis runs, Then incomplete requirements remain non-VALID |

### Step 11 — Completion policy

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                                    |
| Trigger             | Requirements updated                                                                                      |
| Input               | All requirement statuses + evidence                                                                       |
| Decision            | Complete / follow-up / escalate?                                                                          |
| Output              | Policy result Command                                                                                     |
| State change        | COMPLETION_PENDING_BITRIX_UPDATE or WAITING or ESCALATION_PENDING                                         |
| Side effect         | None until policy passes                                                                                  |
| Audit               | COMPLETION_POLICY_PASSED or follow-up/escalation events                                                   |
| Failure             | Incomplete → follow-up; unsafe → escalate                                                                 |
| Recovery            | Follow-up timer via n8n (24h, 48h, max 3)                                                                 |
| Owner               | NestJS postsale-workflows (completion policy)                                                             |
| Given / When / Then | Given any required requirement not VALID with evidence, When policy runs, Then workflow must not complete |

### Step 12 — Bitrix completion

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                             |
| Trigger             | Completion policy passed                                                           |
| Input               | deal_id, summary comment                                                           |
| Decision            | Bitrix update succeeded?                                                           |
| Output              | Stage **Deale do dodania**, comment                                                |
| State change        | COMPLETED (after successful side effects)                                          |
| Side effect         | UPDATE_BITRIX_STAGE_TO_COMPLETED, CREATE_BITRIX_COMMENT                            |
| Audit               | BITRIX_STAGE_UPDATE_SUCCEEDED, WORKFLOW_COMPLETED                                  |
| Failure             | Bitrix failure → COMPLETED blocked, retry                                          |
| Recovery            | side_effect_record retry                                                           |
| Owner               | NestJS bitrix + side-effects                                                       |
| Given / When / Then | Given Bitrix failure, When completion attempted, Then workflow stays pre-COMPLETED |

### Step 13 — Escalation path

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Actor               | NestJS                                                                                                                          |
| Trigger             | Escalation rule matched                                                                                                         |
| Input               | escalation reason, workflow context                                                                                             |
| Decision            | Safe to mark escalated?                                                                                                         |
| Output              | Bitrix **Do ręcznej weryfikacji**, comment, Telegram                                                                            |
| State change        | ESCALATED                                                                                                                       |
| Side effect         | UPDATE_BITRIX_STAGE_TO_ESCALATED, CREATE_BITRIX_COMMENT, SEND_TELEGRAM_NOTIFICATION                                             |
| Audit               | WORKFLOW_ESCALATED                                                                                                              |
| Failure             | Bitrix failure blocks ESCALATED; Telegram failure does not if Bitrix OK for completion path (completion: Telegram non-blocking) |
| Recovery            | Retry technical failures only                                                                                                   |
| Owner               | NestJS bitrix, telegram, side-effects                                                                                           |
| Given / When / Then | Given max follow-ups reached, When policy runs, Then escalation is mandatory                                                    |

## Follow-Up Timer Flow (n8n)

| Attempt | Delay                     | Action                         |
| ------- | ------------------------- | ------------------------------ |
| 1       | 24h after last outbound   | NestJS follow-up if incomplete |
| 2       | 48h after first follow-up | NestJS follow-up if incomplete |
| 3       | per policy                | final follow-up                |
| After 3 | —                         | escalation                     |

n8n schedules timers; NestJS decides whether follow-up is allowed and sends email.

## Forbidden Outcomes (Process Level)

- Incomplete reply → COMPLETED
- VALID without evidence
- Second workflow for same idempotency key
- Email before requirements
- Langflow marks complete or sends email
- n8n updates Bitrix stage without NestJS
