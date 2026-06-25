# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
82/100
```

Last updated:

```text
2026-06-26
```

Updated by:

```text
Codex Audit 2026-06-26 — task-06 APPROVED_FOR_HUMAN_REVIEW; Cleanup pre-PR
```

Evidence basis:

```text
task-06: IngestReplyUseCase + AnalyzeReplyUseCase; evidence guard; escalated_unmatched + ingest idempotency + UNIQUE external_message_id
Retry after partial failure rematches and completes ingest (Codex re-audit fix)
npm test 146/146 PASS (38 suites); npm run lint/build PASS; bash ./scripts/harness-check PASS (2026-06-26)
Codex Audit APPROVED_FOR_HUMAN_REVIEW 2026-06-26; ExecPlan task-06 Done
Production email/webhook still blocked on task-08; attachment contentRef fetch deferred (OD-001)
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 9 |
| Architecture consistency | 10 | 9 |
| Product clarity | 10 | 7 |
| Task quality | 10 | 9 |
| Test coverage | 10 | 8 |
| Runtime validation | 10 | 6 |
| Security | 10 | 9 |
| Reliability | 10 | 9 |
| Observability | 10 | 8 |
| AI slop / maintainability | 10 | 9 |
| **Total** | **100** | **82** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: 9/10

Check: `AGENTS.md`, active ExecPlans, repo tasks, `docs/decision-log.md`, `docs/open-decisions.md`.

Problems found:

- task-10 Linear TBD.
- **Pass:** ExecPlan task-06 Done synced 2026-06-26 post-Fix.
- Linear SEL-81 still manual sync pending.

Recommended fixes:

- Sync Linear SEL-81 to In Review after Codex re-audit.

### 2. Architecture Consistency

Score: 9/10

Check: `ARCHITECTURE.md`, Providers, boundary parsing, forbidden edges.

Problems found:

- **Pass:** Standalone ingest/analyze use cases; parse-before-persist; evidence guard; no COMPLETED in task-06.
- **Pass:** Case 6 `escalated_unmatched` + idempotency; operator Telegram wire remains task-08.

Recommended fixes:

- None blocking for task-06.

### 3. Product Clarity

Score: 7/10

Check: product spec vs implemented behavior.

Problems found:

- Product spec `car_template_notes` wording predates wide-table model (OD-015).

Recommended fixes:

- Docs Maintenance pass on product spec when Human Architect approves.

### 4. Task Quality

Score: 9/10

Check: repo tasks vs `_template.md`.

Problems found:

- **Pass:** task-06 Implementation + Fix reports present; post-Fix Review 2026-06-26.
- PR TBD (working tree).

Recommended fixes:

- PR after Codex re-audit.

### 5. Test Coverage

Score: 8/10

Check: Jest suites vs V1 acceptance baseline.

Problems found:

- Baseline cases 4, 5, 6, 7, 15 covered in unit tests; full 15-case suite (task-09) not implemented.

Recommended fixes:

- task-09 after task-07–08.

### 6. Runtime Validation

Score: 6/10

Check: runtime evidence per ExecPlan.

Problems found:

- Mock/Jest only for reply path; live n8n/Gmail deferred task-08 (acceptable per task Technology Context).

Recommended fixes:

- Runtime evidence when task-08 webhooks wired.

### 7. Security

Score: 9/10

Check: `docs/SECURITY.md`, webhook auth, npm audit, LLM boundary parsing.

Problems found:

- WebhookAuthGuard stub (task-08 scope).
- **Pass:** task-06 unmatched-reply log uses `from_email_hash` not raw email (Fix 2026-06-26).
- **Pass:** No raw LLM persistence; evidence guard blocks VALID without evidence.

Recommended fixes:

- Wire webhook auth in task-08.

### 8. Reliability

Score: 9/10

Check: idempotency, side effects, failure modes.

Problems found:

- **Pass:** task-06 Codex audit APPROVED_FOR_HUMAN_REVIEW 2026-06-26; retry path after partial ingest failure.

Recommended fixes:

- Apply migration `20260626100000_task06_customer_message_idempotency.sql` on Supabase PROD before deploy.

### 9. Observability

Score: 8/10

Check: audit events, structured logs.

Problems found:

- CUSTOMER_REPLY_RECEIVED, REPLY_ANALYSIS_ACCEPTED, `unmatched_reply.escalated` wired.
- Optional: `langflow_run_id` in workflow event payloads.

Recommended fixes:

- Link langflow_run_id in analysis audit payloads (tech debt).

### 10. AI Slop / Maintainability

Score: 9/10

Check: dead code, doc drift, intentional stubs.

Problems found:

- **Pass:** task-06 scope contained; ephemeral benchmark scripts removed from working tree (Cleanup 2026-06-26).
- **Pass:** `.gitignore` extended for local analyze-reply/classify benchmark artifacts.

Recommended fixes:

- Keep task-07 policies separate from ingest/analyze.

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

Current band: **75–89 — good, with manageable debt** (task-06 Codex APPROVED_FOR_HUMAN_REVIEW 2026-06-26).

## Current Top Risks

* Langflow/Email production adapters still stubs (OD-001, OD-003).
* Policy baseline 15 cases not complete (task-09).
* Webhook auth stub until task-08.
* Supabase migrations (`langflow_runs`, `customer_message_idempotency`) must be applied before prod deploy.

## Current Top Improvements

* **Human Architect approval + PR** for task-06.
* Implement **task-07** (completion / follow-up / escalation policies).
* Operator Telegram for unmatched replies in task-08.
* Sync Linear SEL-81 when PR opened.

## History

```text
2026-06-09 - Created - Initial short Docs Maintenance status.
2026-06-19 - Updated - Full evidence-based score after V1 implementation progress; score 63→70.
2026-06-19 - Updated - Review task-13: REQUEST_CHANGES; score 73→70.
2026-06-23 - Updated - Docs sync after module retirement; OD-015 blocking; score 70→65.
2026-06-23 - Updated - Full template persistence removal; task-14/15 cancelled; score 65→60.
2026-06-24 - Updated - OD-015 restoration; template matching PROD validation; score 60→68 (header).
2026-06-24 - Updated - task-05 implementation + lint fix; score 72/100; 116 tests PASS.
2026-06-24 - Updated - task-05 Codex audit APPROVED; boundary fix; score 76/100; 120 tests PASS.
2026-06-24 - Updated - Cleanup Fala 2026-06-24; OD-015 doc drift fixed; TD-MATCH-001 resolved; score 77/100.
2026-06-25 - Updated - Review task-05 after Fix; harness-check PASS; 124 tests; APPROVED_FOR_CODEX_AUDIT; score 78/100.
2026-06-25 - Updated - Codex audit task-05 APPROVED_FOR_HUMAN_REVIEW; reliability +1; score 79/100.
2026-06-26 - Updated - Review task-06 (pre-Fix); score 80/100; 144 tests PASS.
2026-06-26 - Updated - Review task-06 post-Fix; PII redaction; ExecPlan sync; 145 tests; APPROVED_FOR_CODEX_AUDIT; score 81/100.
2026-06-26 - Updated - Codex Audit task-06 APPROVED_FOR_HUMAN_REVIEW; Cleanup pre-PR; 146 tests; score 82/100.
```
