# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
87/100
```

Last updated:

```text
2026-06-26
```

Updated by:

```text
Codex Audit 2026-06-26 (re-run #2) — task-07/08/09 (PR #6); APPROVED_FOR_HUMAN_REVIEW
```

Evidence basis:

```text
PR #6 feat/task-07-08-09 (5 commits): policies, Bitrix write, n8n webhooks, policy tests, two post-Codex fix commits
Codex re-audit 2026-06-26: ingest escalation fallback gate-bypass closed (`fix(task-08): close ingest escalation gate bypass`)
Checks: harness-check.ps1 PASS; npm test 194/194 PASS (49 suites); npm run test:policies 18/18 PASS
Security hardening: WebhookAuthGuard now rejects missing secret in production (`NODE_ENV=production`)
Residual non-blocking debt: ExecPlan task-07/08/09 status still pending in docs; task-07 migration apply pending pre-prod; harness-check script reports PASS despite lint/prettier failures
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 8 |
| Architecture consistency | 10 | 9 |
| Product clarity | 10 | 7 |
| Task quality | 10 | 9 |
| Test coverage | 10 | 10 |
| Runtime validation | 10 | 8 |
| Security | 10 | 9 |
| Reliability | 10 | 9 |
| Observability | 10 | 8 |
| AI slop / maintainability | 10 | 9 |
| **Total** | **100** | **87** |

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

Score: 10/10

Check: `ARCHITECTURE.md`, Providers, boundary parsing, forbidden edges.

Problems found:

- **Pass:** Completion/followup/escalation policies; ExecutePendingSideEffectsUseCase; side-effect guard preserved.
- **Pass:** Langflow `invoke`-only boundary (case 14); gated completion path via `propose_completion` IT.
- **Pass:** `IngestReplyUseCase` escalation path now routes through `EscalateToPendingBitrixUseCase` + `ExecutePendingSideEffectsUseCase`; fallback bypass removed.
- **Pass:** `EscalateToPendingBitrixUseCase` allows escalation from non-terminal statuses while still blocking terminal statuses.
- WebhookAuthGuard remains fail-open only in non-production environments (acceptable for local/test).

Recommended fixes:

- Keep a regression test for any future escalation shortcut that could bypass pending-side-effect gates.

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
- **Pass:** Codex gate-bypass finding closed in commit `7ff7ddd` with gated ingest escalation + regression test.

Recommended fixes:

- Keep task docs/ExecPlan/Linear status synchronized after merge.

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

Score: 8/10

Check: runtime evidence per ExecPlan.

Problems found:

- **Pass:** Supertest covers `workflow/start`, `email/inbound`, `workflow/follow-up-check`, invalid `X-Webhook-Secret`.
- **Pass:** new unit coverage for `WebhookAuthGuard` production behavior and ingest gated escalation.
- No live n8n/Bitrix/Telegram E2E (acceptable pre-prod); migration `20260626120000_task07_followup_escalation_pending.sql` not applied in review env.

Recommended fixes:

- Apply task-07 migration on Supabase before deploy.

### 7. Security

Score: 9/10

Check: `docs/SECURITY.md`, webhook auth, npm audit, LLM boundary parsing.

Problems found:

- **Pass:** WebhookAuthGuard on all `/webhooks/*`; Bitrix write behind side-effect records.
- **Pass:** production mode now rejects missing `N8N_WEBHOOK_SECRET`.
- **Pass:** Cases 5, 7, 8, 14, 15 covered in policy suite.

Recommended fixes:

- Keep production deploy checklist requirement for `N8N_WEBHOOK_SECRET`.

### 8. Reliability

Score: 9/10

Check: idempotency, side effects, failure modes.

Problems found:

- **Pass:** Follow-up max 3; first Bitrix failure blocks COMPLETED (case 10); Telegram non-blocking (case 13).
- **Pass:** Retry after failed Bitrix completion now reopens existing FAILED side_effect_record with `retryAllowed=true` and reuses idempotency key safely.
- **Pass:** Escalation Bitrix path now reuses completion-style blocked handling (`bitrix_update_failed`) instead of throwing.
- **Pass:** `ProcessFollowupCheckUseCase` now returns current pending status when side effects are blocked.
- **Pass:** Ingest escalation from unexpected statuses now goes through pending Bitrix gate; no direct terminal escalation bypass.
- Migration apply pending before prod.

Recommended fixes:

- Apply task-07 migration in target environment before production deploy.

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

Current band: **75–89 — good, with manageable debt** (task-07/08/09 Codex re-audit APPROVED_FOR_HUMAN_REVIEW 2026-06-26).

## Current Top Risks

* Supabase task-07 migration not applied in review environment.
* harness-check script currently reports PASS despite lint/prettier failures in output.

## Current Top Improvements

* Docs Maintenance: mark task-07/08/09 done in ExecPlan/tasks and sync Linear SEL-82/83/84.
* Improve harness-check to fail when lint fails (avoid false-green gate).
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
2026-06-26 - Updated - Codex Audit re-run #2 task-07/08/09 PR #6; ingest gate bypass fixed, production webhook-secret guard added; harness-check + npm test + test:policies PASS; APPROVED_FOR_HUMAN_REVIEW; score 87/100.
```
