# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
79/100
```

Last updated:

```text
2026-06-25
```

Updated by:

```text
Codex Audit 2026-06-25 — task-05 APPROVED_FOR_HUMAN_REVIEW after Fix + Review pass
```

Evidence basis:

```text
CreateRequirementsUseCase + SendInitialEmailUseCase standalone; Langflow parsers + validation
langflow_runs: parsed_success + validation_errors only; raw_output always NULL; stable error codes
Supabase repos: workflow_requirements, langflow_runs, outgoing_messages
npm test 124/124 PASS (31 suites); npm run lint/typecheck/build PASS; bash ./scripts/harness-check PASS (2026-06-25)
Baseline cases 4, 5, 15 + OD-015 zero-notes + side_effect before send in unit tests
Review APPROVED_FOR_CODEX_AUDIT 2026-06-25; Codex audit APPROVED_FOR_HUMAN_REVIEW 2026-06-25 (re-audit after Fix)
Production email still blocked on OD-001 adapter; Langflow prod on OD-003
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 9 |
| Architecture consistency | 10 | 8 |
| Product clarity | 10 | 7 |
| Task quality | 10 | 9 |
| Test coverage | 10 | 8 |
| Runtime validation | 10 | 6 |
| Security | 10 | 8 |
| Reliability | 10 | 8 |
| Observability | 10 | 8 |
| AI slop / maintainability | 10 | 8 |
| **Total** | **100** | **79** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: 9/10

Check: `AGENTS.md`, active ExecPlans, repo tasks, `docs/decision-log.md`, `docs/open-decisions.md`.

Problems found:

- task-10 Linear TBD.
- **Pass:** ExecPlan, process-map, architecture doc synced post-OD-015 (Cleanup 2026-06-24).
- TD-MATCH-001 resolved in tech-debt-tracker.

Recommended fixes:

- Close OD-015 formally in open-decisions when Human Architect approves notes source.

### 2. Architecture Consistency

Score: 8/10

Check: `ARCHITECTURE.md`, Providers, boundary parsing, forbidden edges.

Problems found:

- **Pass:** Standalone use cases (task-05); Langflow/Email via Provider interfaces; record-before-send side effects.
- **Pass:** Template matching restored (OD-015); `StartWorkflowUseCase` unchanged.
- **Pass:** task-05 Codex audit APPROVED_FOR_HUMAN_REVIEW 2026-06-25 — parse-before-persist; no raw LLM in `langflow_runs`.

Recommended fixes:

- None blocking for task-05 architecture boundary.

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

- **Pass:** task-05 Implementation Final Report + Fix report present (2026-06-25).
- **Pass:** Review 2026-06-25 APPROVED_FOR_CODEX_AUDIT; harness-check green.
- task-06–09 remain Ready; PR TBD for task-05.

Recommended fixes:

- Sync Linear SEL-79 to In Review / Done after Codex re-audit and Human Architect merge.

### 5. Test Coverage

Score: 8/10

Check: Jest suites vs V1 acceptance baseline.

Problems found:

- Baseline cases 4, 5, 15 covered; full 15-case policy suite (task-09) not implemented.

Recommended fixes:

- task-09 after task-06–08.

### 6. Runtime Validation

Score: 6/10

Check: runtime evidence per ExecPlan.

Problems found:

- Langflow and email providers use stubs in app module; live E2E pending task-08 credentials.
- PROD template match evidence documented; requirements/email path mock-only in tests.

Recommended fixes:

- Runtime evidence for INITIAL_EMAIL_SENT with sandbox email provider.

### 7. Security

Score: 8/10

Check: `docs/SECURITY.md`, webhook auth, npm audit, LLM boundary parsing.

Problems found:

- WebhookAuthGuard stub (task-08 scope).
- npm audit vulnerabilities unchanged.
- **Pass:** task-05 Codex audit 2026-06-25 — no raw LLM persistence; stable `validation_errors` codes only.

Recommended fixes:

- Wire webhook auth in task-08.
- Production email adapter after OD-001 (non-blocking for audited code path).

### 8. Reliability

Score: 8/10

Check: idempotency, side effects, failure modes.

Problems found:

- CreateRequirements and SendInitialEmail use idempotency / side_effect_record patterns.
- Email send failure marks side_effect FAILED with retry_allowed.
- **Pass:** Codex audit 2026-06-25 confirmed idempotent SEND_INITIAL_EMAIL path.

Recommended fixes:

- Integration test for email retry path in task-08.

### 9. Observability

Score: 8/10

Check: audit events, structured logs.

Problems found:

- REQUIREMENTS_CLASSIFIED, WORKFLOW_REQUIREMENTS_CREATED, INITIAL_EMAIL_SENT events wired.
- langflow_runs: `parsed_success`, `validation_errors` (stable codes); `raw_output` deprecated NULL.

Recommended fixes:

- Optional: link `langflow_run_id` in workflow_events payload for 1:1 correlation.

### 10. AI Slop / Maintainability

Score: 8/10

Check: dead code, doc drift, intentional stubs.

Problems found:

- CRLF lint fixed 2026-06-25 (7 Langflow integration files); stable Langflow validation error codes.

Recommended fixes:

- Keep task-06 scope separate from task-05; avoid monolith growth in StartWorkflowUseCase.

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

Current band: **75–89 — good, with manageable debt** (task-05 Codex APPROVED_FOR_HUMAN_REVIEW 2026-06-25).

## Current Top Risks

* Langflow/Email production adapters still stubs (OD-001, OD-003).
* Policy baseline 15 cases not complete (task-09).
* Webhook auth stub until task-08.
* Supabase migration `20260624200000_langflow_runs_parse_audit` must be applied before prod deploy.

## Current Top Improvements

* Implement **task-06** (reply ingestion + evidence).
* Apply langflow_runs migration on Supabase PROD.
* Human Architect merge approval for task-05.
* Sync Linear SEL-79 to Done.

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
```
