# Design Doc: Postsale Agent EVAPREMIUM V1 — Langflow Tools

Status: Accepted
Owner: Human Architect
Created: 2026-06-17
Last updated: 2026-06-17

Linked product spec: `docs/product-specs/postsale-agent-v1.md`
Linked architecture: `docs/design-docs/postsale-agent-architecture.md`

## Principle

Langflow is a controlled AI module. NestJS owns all side effects and state transitions.

For **workflow-wide agent loops** (invoking individual NestJS capabilities without full `start_workflow`), see `docs/design-docs/postsale-agent-capabilities-agent-loop.md` and open decisions OD-008–OD-010. V1 Langflow tools below apply to **task-local** agent loops inside classify/draft/analyze flows.

```text
NestJS UseCase
  → LangflowProvider.invoke(flow, tools, context)
  → raw LLM JSON output
  → LangflowOutputParser (boundary)
  → trusted Domain/Command objects
  → NestJS policy validation
  → side_effect_record + execution (NestJS only)
```

## V1 Langflow Flows

| Flow ID | Purpose |
| --- | --- |
| classify-template-notes-to-requirement-labels | Map notes → requirement labels |
| draft-initial-email | First customer email draft |
| analyze-customer-reply | Match reply to requirements |
| draft-followup-email | Follow-up email draft |

## Requirement Labels

| Label | Meaning |
| --- | --- |
| YES_NO_INFO | Yes/no or informational confirmation |
| OPTION_SELECTION | Customer must select from options |
| MEASUREMENT | Numeric/measurement value required |
| TEXT_CONFIRMATION | Free-text confirmation required |
| PHOTO_REQUIRED | Photo evidence required |

Rules: confidence threshold 0.75; unsafe_notes → NestJS escalates; preserve source_field and source_note.

## Approved Read Tools

| Tool | Returns |
| --- | --- |
| get_workflow_context | deal, customer, vehicle, product, workflow status |
| get_selected_template_notes | notes selected for this workflow |
| get_workflow_requirements | current requirements + statuses |
| get_customer_messages | prior inbound/outbound messages |
| get_previous_evidence | evidence already linked to requirements |

## Approved AI Task Tools

| Tool | Action |
| --- | --- |
| classify_template_notes_to_requirement_labels | Classification flow |
| draft_initial_email | Initial email draft flow |
| analyze_customer_reply | Reply analysis flow |
| draft_followup_email | Follow-up draft flow |

## Approved Proposal Tools

| Tool | Proposal |
| --- | --- |
| propose_completion | NestJS re-validates via CompletionPolicy |
| propose_followup | Missing requirements + draft reason |
| propose_manual_review | Escalation reason |

## Approved Controlled Request Tools

| Tool | Effect |
| --- | --- |
| request_manual_review | NestJS EscalationUseCase |
| request_followup_email | NestJS FollowupUseCase |

## Forbidden Direct Tools

Must not exist in Langflow V1:

- send_email_directly
- update_bitrix_stage_directly
- mark_workflow_completed_directly
- write_db_directly
- send_telegram_directly
- create_bitrix_comment_directly

## Langflow Output Schemas

### classify-template-notes (per note)

```text
source_field, source_note, requirement_label, question_text,
classification_reason, confidence (0..1), unsafe (boolean)
```

Reject if confidence < 0.75 or unsafe = true.

### draft-email

```text
subject, body_text, body_html (optional), proposed_requirement_refs[], confidence
```

### analyze-customer-reply

```text
requirement_updates[]: requirement_id, proposed_status, evidence_proposals[],
  confidence, analysis_reason
unsafe (boolean), proposed_next_action: COMPLETE | FOLLOWUP | MANUAL_REVIEW
```

NestJS: never accept VALID without stored evidence; never accept COMPLETE if any required requirement lacks VALID + evidence.

## Langflow Run Audit (langflow_runs)

Record: workflow_id, flow_name, request_id, input_hash, raw_output_ref, parsed_success, validation_errors, duration_ms.

## Tool Access Matrix

| Capability | Langflow | NestJS | n8n |
| --- | --- | --- | --- |
| Read workflow context | via tools | yes | no |
| Classify / draft / analyze | yes | validates | no |
| Write Supabase | no | yes | no |
| Send email | no | yes | no |
| Update Bitrix | no | yes | no |
| Send Telegram | no | yes | no |
| Completion decision | propose only | yes | no |
| Follow-up timer | no | decides | schedules |
