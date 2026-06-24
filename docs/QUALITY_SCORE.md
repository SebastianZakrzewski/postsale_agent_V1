# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
68/100
```

Last updated:

```text
2026-06-24
```

Updated by:

```text
Implementation — OD-015 wide template matching + PROD validation
```

Evidence basis:

```text
template-matching domain restored; MatchWorkflowTemplateUseCase wired with car_template_id
npm test 106/106 PASS (25 suites); npm run build PASS
PROD audit: 99.4% Stage 1 self-match, 100% Stage 2 note logic (118755 scenario runs)
docs/references/template-matching-validation.md; task-05 unblocked
Verdict: match step production-ready for task-05; Codex audit recommended before risky deploy
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 8 |
| Architecture consistency | 10 | 8 |
| Product clarity | 10 | 7 |
| Task quality | 10 | 7 |
| Test coverage | 10 | 8 |
| Runtime validation | 10 | 7 |
| Security | 10 | 6 |
| Reliability | 10 | 7 |
| Observability | 10 | 6 |
| AI slop / maintainability | 10 | 6 |
| **Total** | **100** | **60** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: 8/10

Check: `AGENTS.md`, active ExecPlans, repo tasks, `docs/decision-log.md`, `docs/open-decisions.md`.

Problems found:

- **Fixed (2026-06-23):** Full template removal logged; OD-015 reframed; task-14/15 cancelled; migration added.
- **Remaining:** task-10 Linear TBD; product spec still references template match (historical).

Recommended fixes:

- Close OD-015 in open-decisions when Human Architect approves notes source.

### 2. Architecture Consistency

Score: 7/10

Check: `ARCHITECTURE.md`, Providers, boundary parsing, forbidden edges.

Problems found:

- **Pass:** Workflow orchestration (task-12), Bitrix parse boundary, idempotency/audit patterns intact.
- **Open:** No automated template match — intentional removal (TD-MATCH-001).
- **Open:** TD-ARCH-001/003 unchanged.

Recommended fixes:

- Resolve OD-015 before task-05.

### 3. Product Clarity

Score: 7/10

Check: product spec vs implemented behavior.

Problems found:

- Product spec still describes automated template match — **not implemented**; removal documented in decision log.

Recommended fixes:

- No product spec change required until matcher policy changes.

### 4. Task Quality

Score: 7/10

Check: repo tasks vs `_template.md`.

Problems found:

- task-03/11/13 Done historically; task-14/15 **Cancelled** (2026-06-23).
- task-05 correctly **Blocked** on OD-015.

Recommended fixes:

- Resolve OD-015 before unblocking task-05.

### 5. Test Coverage

Score: 6/10

Check: Jest suites vs V1 acceptance baseline.

Problems found:

- `npm test` — **53 tests PASS** (18 suites, 2026-06-23); template module tests removed with persistence removal.
- Integration tests assert stub behavior (`template_mapping_not_implemented`).
- Policy baseline (task-09) not implemented.

Recommended fixes:

- Re-add requirements/matching tests when OD-015 defines new notes source.

### 6. Runtime Validation

Score: 5/10

Check: runtime evidence per ExecPlan.

Problems found:

- No live template match path in app post-retirement.
- task-13 PROD benchmark historical only; scripts removed.
- Webhook integration tests pass with stub matcher (escalation path only).

Recommended fixes:

- Re-link runtime evidence after OD-015 and task-05 resume.

### 7. Security

Score: 6/10

Check: `docs/SECURITY.md`, webhook auth, npm audit.

Problems found:

- WebhookAuthGuard stub (task-08 scope).
- npm audit vulnerabilities unchanged.

Recommended fixes:

- Wire webhook auth in task-08.

### 8. Reliability

Score: 7/10

Check: idempotency, side effects, failure modes.

Problems found:

- Cross-cutting reliability patterns intact for implemented layers.
- Match step always escalates — operational noise until OD-015 resolved.

Recommended fixes:

- Resolve OD-015; then implement task-05 notes path.

### 9. Observability

Score: 6/10

Check: audit events, structured logs.

Problems found:

- Audit/idempotency logging intact.
- Match failure reason `template_mapping_not_implemented` visible in escalation payload.

Recommended fixes:

- Add structured log on matcher stub if operators need visibility.

### 10. AI Slop / Maintainability

Score: 6/10

Check: dead code, doc drift, intentional stubs.

Problems found:

- **Positive:** Full removal decision logged; `MatchWorkflowTemplateUseCase` stub explicit.
- **Risk:** Product spec / design docs still describe historical template steps (amended 2026-06-23).
- Removed template-import/matching modules, Supabase repos, import scripts; test count 85→53.

Recommended fixes:

- Keep future notes source scope minimal per OD-015 decision.

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

Current band: **60–74 — usable, but needs cleanup/review**.

## Current Top Risks

* Matcher stub — all deals escalate; task-05 blocked (OD-015).
* Reduced test coverage vs pre-removal baseline (53 vs 85+ tests).
* task-13 PROD accuracy historical only; no in-app template persistence.
* Webhook auth stub until task-08.

## Current Top Improvements

* Human Architect resolves **OD-015** (requirements/notes source).
* Unblock and implement **task-05** after OD-015.
* Re-add matching/requirements tests with approved notes path.

## History

```text
2026-06-09 - Created - Initial short Docs Maintenance status.
2026-06-19 - Updated - Full evidence-based score after V1 implementation progress; score 63→70.
2026-06-19 - Updated - Review task-13: REQUEST_CHANGES; score 73→70.
2026-06-23 - Updated - Docs sync after module retirement; OD-015 blocking; score 70→65.
2026-06-23 - Updated - Full template persistence removal; task-14/15 cancelled; score 65→60.
```
