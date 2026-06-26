# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
84/100
```

Last updated:

```text
2026-06-26
```

Updated by:

```text
Codex Audit 2026-06-26 (re-run) — task-07/08/09 (PR #6); REQUEST_CHANGES
```

Evidence basis:

```text
PR #6 feat/task-07-08-09 (4 commits): policies, Bitrix write, n8n webhooks, policy tests, post-Codex fixes
Re-Review + Codex re-audit 2026-06-26: prior gaps closed — retry on failed Bitrix side effect, escalation path blocking parity, follow-up-check blocked status, analyze-reply gated escalation
Checks: harness-check.ps1 PASS; npm test 191/191 PASS (48 suites); npm run test:policies 18/18 PASS
Remaining Codex finding: IngestReply fallback still uses EscalateWorkflowUseCase for non-WAITING/REQUIREMENTS_UPDATED states, which can bypass ESCALATION_PENDING_BITRIX_UPDATE gate
Known deployment risk: webhook auth allows requests when N8N_WEBHOOK_SECRET is unset (OD-007 still non-blocking, production hardening pending)
ExecPlan task-07/08/09 still pending; migration apply pending pre-prod
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 8 |
| Architecture consistency | 10 | 8 |
| Product clarity | 10 | 7 |
| Task quality | 10 | 9 |
| Test coverage | 10 | 10 |
| Runtime validation | 10 | 7 |
| Security | 10 | 8 |
| Reliability | 10 | 8 |
| Observability | 10 | 8 |
| AI slop / maintainability | 10 | 9 |
| **Total** | **100** | **84** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: 8/10

Check: `AGENTS.md`, active ExecPlans, repo tasks, `docs/decision-log.md`, `docs/open-decisions.md`.

Problems found:

- ExecPlan still lists task-07/08/09 as pending; task files Status: Ready (not Done).
- Linear SEL-82/83/84 manual sync pending.

Recommended fixes:

- Docs Maintenance after Fix: ExecPlan progress, task History, Linear sync.

### 2. Architecture Consistency

Score: 8/10

Check: `ARCHITECTURE.md`, Providers, boundary parsing, forbidden edges.

Problems found:

- **Pass:** Completion/followup/escalation policies; ExecutePendingSideEffectsUseCase; side-effect guard preserved.
- **Pass:** Langflow `invoke`-only boundary (case 14); gated completion path via `propose_completion` IT.
- **Gap:** `IngestReplyUseCase` fallback path still calls `EscalateWorkflowUseCase` for statuses outside `{REQUIREMENTS_UPDATED, WAITING_FOR_CUSTOMER_REPLY}` → possible terminal `ESCALATED` without `ESCALATION_PENDING_BITRIX_UPDATE` + `ExecutePendingSideEffectsUseCase`.
- WebhookAuthGuard allows all traffic when `N8N_WEBHOOK_SECRET` unset (dev convenience; prod must set secret).

Recommended fixes:

- Route all ingest escalation paths through `EscalateToPendingBitrixUseCase` + `ExecutePendingSideEffectsUseCase` (remove fallback bypass).
- Document prod requirement: `N8N_WEBHOOK_SECRET` mandatory before expose.

### 3. Product Clarity

Score: 7/10

Check: product spec vs implemented behavior.

Problems found:

- Product spec `car_template_notes` wording predates wide-table model (OD-015).

Recommended fixes:

- Docs Maintenance pass on product spec when Human Architect approves.

### 4. Task Quality

Score: 10/10

Check: repo tasks vs `_template.md`.

Problems found:

- **Pass:** task-07/08/09 implementation on PR #6; policy suite 15 cases in Jest.
- **Pass:** task-09 policy README; task-08 webhook Supertest; task-07 propose_completion IT (fix commit `80ba26e`).
- Codex: task-08 gate-bypass on analyze/ingest escalation paths not fully closed.

Recommended fixes:

- Fix mode: gated escalation for analyze/ingest + Bitrix retry + escalation error handling.

### 5. Test Coverage

Score: 9/10

Check: Jest suites vs V1 acceptance baseline.

Problems found:

- **Pass:** 191 Jest tests; `npm run test:policies` 18/18; cases 1–15 in baseline-policy specs + unit specs.
- **Pass:** `src/tests/policies/README.md` case→spec mapping.
- **Pass:** regression test added for Bitrix side-effect retry after `retry_allowed` failure.

Recommended fixes:

- Keep policy baseline map in sync with future case additions.

### 6. Runtime Validation

Score: 7/10

Check: runtime evidence per ExecPlan.

Problems found:

- **Pass:** Supertest covers `workflow/start`, `email/inbound`, `workflow/follow-up-check`, invalid `X-Webhook-Secret`.
- No live n8n/Bitrix/Telegram E2E (acceptable pre-prod); migration `20260626120000_task07_followup_escalation_pending.sql` not applied in review env.

Recommended fixes:

- Apply task-07 migration on Supabase before deploy.

### 7. Security

Score: 8/10

Check: `docs/SECURITY.md`, webhook auth, npm audit, LLM boundary parsing.

Problems found:

- **Pass:** WebhookAuthGuard on all `/webhooks/*`; Bitrix write behind side-effect records.
- **Pass:** Cases 5, 7, 8, 14, 15 covered in policy suite.
- Webhook auth bypass when secret unset.

Recommended fixes:

- Enforce secret in production deploy checklist (Codex + Human Architect).

### 8. Reliability

Score: 8/10

Check: idempotency, side effects, failure modes.

Problems found:

- **Pass:** Follow-up max 3; first Bitrix failure blocks COMPLETED (case 10); Telegram non-blocking (case 13).
- **Pass:** Retry after failed Bitrix completion now reopens existing FAILED side_effect_record with `retryAllowed=true` and reuses idempotency key safely.
- **Pass:** Escalation Bitrix path now reuses completion-style blocked handling (`bitrix_update_failed`) instead of throwing.
- **Pass:** `ProcessFollowupCheckUseCase` now returns current pending status when side effects are blocked.
- **Gap:** Ingest fallback gate bypass can finalize escalation without Bitrix pending-side-effect execution.
- Migration apply pending before prod.

Recommended fixes:

- Remove ingest fallback bypass and add regression test for status transition through pending Bitrix gate.

### 9. Observability

Score: 8/10

Check: audit events, structured logs.

Problems found:

- **Pass:** Policy use cases emit audit via existing EmitWorkflowEventUseCase paths.
- Follow-up/completion audit events rely on side-effect + workflow status transitions.

Recommended fixes:

- Codex verify audit event names match design doc at merge.

### 10. AI Slop / Maintainability

Score: 9/10

Check: dead code, doc drift, intentional stubs.

Problems found:

- **Pass:** Focused diff; policies separated from integrations; Windows harness-check.ps1 additive.
- Untracked local smoke script `scripts/run-e2e-wrangler-tj.ts` correctly excluded from PR.

Recommended fixes:

- None blocking.

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

Current band: **75–89 — good, with manageable debt** (task-07/08/09 Codex re-audit REQUEST_CHANGES 2026-06-26).

## Current Top Risks

* Ingest fallback escalation can bypass Bitrix pending gate (`ESCALATED` in app while CRM side effects may be skipped).
* Webhook auth disabled when `N8N_WEBHOOK_SECRET` unset.
* Supabase task-07 migration not applied in review environment.

## Current Top Improvements

* **Fix** remaining ingest fallback gate bypass + add targeted regression test → re-Review → Codex re-run.
* Docs Maintenance: ExecPlan task-07/08/09 Done, Linear SEL-82/83/84.
* Production n8n/Langflow/Telegram wiring (OD-001, OD-005).

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
2026-06-26 - Updated - Review task-07/08/09 PR #6; 181 tests; policy 15/15 Jest; REQUEST_CHANGES (README, webhook Supertest, propose_completion IT); score 84/100.
2026-06-26 - Updated - Re-Review task-07/08/09 PR #6 post-Fix; 187 tests; APPROVED_FOR_CODEX_AUDIT; score 86/100 (interim).
2026-06-26 - Updated - Codex Audit task-07/08/09 PR #6; reliability/architecture gaps; REQUEST_CHANGES; score 82/100.
2026-06-26 - Updated - Codex Audit re-run task-07/08/09 PR #6; 3 prior findings closed, ingest fallback gate bypass remains; harness-check + npm test + test:policies PASS; REQUEST_CHANGES; score 84/100.
```
