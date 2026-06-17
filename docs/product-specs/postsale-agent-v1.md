# Product Spec: Postsale Agent EVAPREMIUM V1

Status: Approved
Owner: Human Architect
Created: 2026-06-17
Last updated: 2026-06-17
Approved by: Human Architect (Architecture Context Pack)
Approved on: 2026-06-17

Linked ExecPlan:

- `docs/exec-plans/active/postsale-agent-v1.md`

Linked design docs:

- `docs/design-docs/postsale-agent-process-map.md`
- `docs/design-docs/postsale-agent-architecture.md`
- `docs/design-docs/postsale-agent-langflow-tools.md`
- `docs/design-docs/postsale-agent-ai-security-observability.md`

Linear:

- SEL-73 — Zaprojektować architekturę agenta posprzedażowego

## Purpose

Business goal:
Build a post-sale agent for EVAPREMIUM that collects required customer information after a Bitrix deal enters the post-sale information collection stage.

Primary users:

- EVAPREMIUM customers (email respondents)
- Internal operators (Telegram notifications, manual review in Bitrix)
- System operators (audit, side-effect records, workflow events)

Trigger:
Bitrix deal stage becomes **Oczekiwanie na Zdjęcia**.

Final result:

- Customer requirements collected with evidence, workflow completed, Bitrix moved to **Deale do dodania**, OR
- Safe escalation to **Do ręcznej weryfikacji** with operator notification and audit trail

Must-never-happen:

- An incomplete customer reply must never be treated as complete.
- A requirement marked VALID without evidence.
- Duplicate workflows from repeated Bitrix triggers.
- Langflow or n8n bypassing NestJS completion policy or writing side effects directly.

Success criteria:

- All V1 acceptance criteria and test baseline cases pass.
- Runtime evidence exists for workflow start, classification, email send, reply ingestion, evidence storage, completion, escalation, and Bitrix updates.
- Idempotency prevents duplicate unsafe side effects.

## V1 Scope

V1 includes:

- one-time import of EVAMATS template base into Supabase
- car template matching using exact match + aliases
- selection of relevant template notes by product + body type
- Langflow classification of selected notes into requirement labels
- requirements persistence in Supabase
- initial customer email
- customer reply ingestion
- attachments + links as evidence
- Langflow reply analysis
- backend completion policy
- follow-ups (24h, 48h, max 3)
- escalation
- Bitrix stage update and comment
- Telegram operator notification
- audit events
- side effect records
- idempotency
- runtime validation
- test baseline (15 required cases)

V1 excludes:

- image correctness classification
- customer upload portal
- scheduled automatic template sync
- multi-agent architecture
- full admin dashboard
- fuzzy template matching
- microservices
- CQRS / event sourcing

## Process Mapping

See canonical step-by-step mapping in `docs/design-docs/postsale-agent-process-map.md`.

Summary workflow:

1. Bitrix deal enters **Oczekiwanie na Zdjęcia**
2. n8n sends trigger to NestJS
3. NestJS checks idempotency
4. NestJS creates postsale workflow in Supabase
5. NestJS loads deal/customer/vehicle/product context
6. NestJS matches car template
7. NestJS selects relevant template notes by product + body type
8. Langflow classifies notes into requirement labels
9. NestJS validates Langflow output
10. NestJS stores workflow_requirements
11. Langflow drafts initial customer email
12. NestJS validates draft and sends email
13. workflow waits for customer reply
14. n8n receives email reply
15. NestJS matches reply to workflow
16. NestJS stores message, attachments, links
17. Langflow analyzes reply against requirements
18. NestJS validates analysis and stores evidence
19. NestJS applies completion policy

Forbidden outcomes:

- VALID requirement without evidence
- COMPLETED workflow with PENDING / PARTIAL / UNCLEAR required requirements
- Initial email sent before requirements are created
- Direct side-effect execution from Langflow or n8n
- Bitrix completion side effect executed twice

## Lifecycle And State

### WorkflowStatus (current state)

Examples:

- STARTED
- CONTEXT_LOADED
- TEMPLATE_MATCHED
- REQUIREMENTS_CREATED
- WAITING_FOR_CUSTOMER_REPLY
- REQUIREMENTS_UPDATED
- COMPLETION_PENDING_BITRIX_UPDATE
- COMPLETED
- ESCALATED
- FAILED

### WorkflowEventType (historical audit)

Examples:

- WORKFLOW_STARTED
- DEAL_CONTEXT_LOADED
- TEMPLATE_MATCH_SUCCEEDED
- REQUIREMENTS_CLASSIFIED
- WORKFLOW_REQUIREMENTS_CREATED
- INITIAL_EMAIL_SENT
- CUSTOMER_REPLY_RECEIVED
- REPLY_ANALYSIS_ACCEPTED
- REQUIREMENT_STATUSES_UPDATED
- COMPLETION_POLICY_PASSED
- BITRIX_STAGE_UPDATE_SUCCEEDED
- WORKFLOW_COMPLETED
- WORKFLOW_ESCALATED

Rule: WorkflowStatus and WorkflowEventType are separate enums. Do not reuse one enum for both.

### Bitrix stages

| Purpose | Stage |
| --- | --- |
| Start | Oczekiwanie na Zdjęcia |
| Completed | Deale do dodania |
| Escalation / manual review | Do ręcznej weryfikacji |

### Allowed transitions (summary)

- Active workflow progresses through context load, template match, requirements creation, waiting for reply, requirements update, and completion or escalation pending Bitrix update.
- Terminal states: COMPLETED, ESCALATED, FAILED (per policy).
- Recovery: business uncertainty escalates; technical failures retry per reliability policy.

## Business Rules

Accepted rules:

### Template import

- Source: Excel / Google Sheet (one-time controlled import).
- Runtime source: Supabase/PostgreSQL.
- `car_templates` stores normalized fields and `raw_row_json`.
- `car_template_notes` stores selected notes/questions.
- `template_import_batches` stores import metadata.

### Template matching

- Normalize brand/model/body/generation.
- Exact match first, alias match second.
- Exactly one match → MATCHED.
- Zero or more than one match → escalate to **Do ręcznej weryfikacji**.

### Requirement labels

Langflow maps selected template notes to:

- YES_NO_INFO
- OPTION_SELECTION
- MEASUREMENT
- TEXT_CONFIRMATION
- PHOTO_REQUIRED

Classification rules:

- confidence threshold: 0.75
- `unsafe_notes` → manual review
- `question_text` may be lightly rewritten but must not change `source_note` meaning
- `classification_reason` is stored
- `source_field` and `source_note` must be preserved
- VALID requirement must have evidence

### Evidence

Accepted evidence types:

- TEXT_FRAGMENT
- EMAIL_ATTACHMENT
- EXTERNAL_LINK
- MANUAL_APPROVAL

Sources: email attachments, links in email body, text fragments, manual approval.

Rule: VALID without evidence is forbidden.

### Follow-up policy

- first follow-up after 24h
- second after 48h
- max 3 follow-ups
- after max attempts → escalation

### Completion policy

Workflow can complete only if:

- workflow is active
- `template_match_status = MATCHED`
- all required requirements are VALID
- every VALID requirement has evidence
- no required requirement is PENDING, PARTIAL, or UNCLEAR
- no `unsafe_notes`
- latest Langflow output passed validation
- workflow is not already terminal
- Bitrix completion side effect was not already executed

Completion flow:

```text
REQUIREMENTS_UPDATED
→ COMPLETION_POLICY_PASSED
→ COMPLETION_PENDING_BITRIX_UPDATE
→ Bitrix update to Deale do dodania
→ COMPLETED
```

### Escalation rules

Escalate when:

- no template found
- ambiguous template
- insufficient vehicle data
- unsafe notes
- confidence below 0.75
- reply cannot be matched to workflow
- max follow-ups reached
- Langflow output invalid
- unrecoverable technical failure

Escalation flow:

```text
ESCALATION_PENDING_BITRIX_UPDATE
→ Bitrix update to Do ręcznej weryfikacji
→ Bitrix comment
→ Telegram notification
→ ESCALATED
```

### Side effects

Every side effect must have `side_effect_record` before execution.

Side effect types:

- SEND_INITIAL_EMAIL
- SEND_FOLLOWUP_EMAIL
- UPDATE_BITRIX_STAGE_TO_COMPLETED
- UPDATE_BITRIX_STAGE_TO_ESCALATED
- CREATE_BITRIX_COMMENT
- SEND_TELEGRAM_NOTIFICATION

Telegram failure does not block COMPLETED if Bitrix update succeeded.

### Langflow boundaries

Langflow can classify, draft, analyze, propose next action, and use approved tools.

Langflow cannot send email, update Bitrix, mark workflow completed, write Supabase, send Telegram, create Bitrix comment, or bypass NestJS completion policy.

Assumptions (not accepted until promoted):

- None for V1 core behavior; operational deployment details tracked as non-blocking OPEN_DECISIONs.

## Edge Cases

- Duplicate Bitrix trigger for same deal → idempotency ignores second workflow creation.
- Template not found or ambiguous → escalation, no customer email with wrong requirements.
- Customer reply with no matching workflow → escalation.
- Partial reply covering some requirements → follow-up, not completion.
- Langflow confidence below 0.75 → reject output, escalate or manual review.
- Bitrix API failure on completion → COMPLETED blocked until side effect succeeds or policy escalates.
- Telegram failure after successful Bitrix update → workflow may still reach COMPLETED.

## Forbidden Behavior

- Treat incomplete reply as complete.
- Mark VALID without evidence.
- Send initial email before requirements exist.
- Langflow direct side effects.
- n8n-owned business validation or completion decisions.
- Retry business uncertainty (template ambiguity, unsafe notes, low confidence).
- Reuse WorkflowStatus enum as WorkflowEventType.

## Integrations And Side Effects

Allowed side effects:

- Customer email (initial and follow-up)
- Bitrix stage update and comment
- Telegram operator notification
- Supabase persistence (via NestJS repositories only)
- Langflow invocation (read/proposal tools only)

Forbidden side effects:

- Langflow direct email, Bitrix, DB, Telegram writes
- n8n direct workflow state transitions without NestJS
- Side effect execution without prior `side_effect_record`
- Completion Bitrix update without completion policy pass

## Acceptance Criteria

1. Duplicate Bitrix trigger does not create second workflow.
2. Template not found escalates.
3. Ambiguous template escalates.
4. Unsafe Langflow notes escalate.
5. Initial email is not sent before requirements are created.
6. Reply without workflow match escalates.
7. VALID without evidence is rejected.
8. Incomplete requirements do not complete workflow.
9. Complete requirements move Bitrix to **Deale do dodania**.
10. Bitrix failure prevents COMPLETED.
11. Follow-up sent only when missing requirements exist.
12. Max 3 follow-ups then escalation.
13. Telegram failure does not block business completion.
14. Direct side-effect tools are forbidden in Langflow.
15. Langflow output below confidence threshold is rejected.

## OPEN_DECISIONs

Blocking:

- None.

Non-blocking:

- See `docs/open-decisions.md` for operational deployment details (email provider, deployment target, field mappings).

## Approval Record

Draft notes:

- Architecture Context Pack provided 2026-06-17 with Stages 1–7 complete.

Approval notes:

- Human Architect accepted V1 business rules, lifecycle, forbidden outcomes, integrations, and acceptance criteria via Architecture Context Pack.
- Product spec is implementation source of truth for Task Designer and Implementation.
