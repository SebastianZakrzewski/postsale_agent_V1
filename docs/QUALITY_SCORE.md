# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
72/100
```

Last updated:

```text
2026-06-19
```

Updated by:

```text
Review Mode (task-12, 2026-06-19)
```

Evidence basis:

```text
Review task-12: npm test 83/83 PASSED; build PASSED; local npm run lint FAILED (6889 prettier CRLF on Windows checkout); harness-check not run locally (bash pipefail on Windows; CI ubuntu expected)
Scope/behavior: behavior-preserving start refactor verified; TD-ARCH-002 resolved; forbidden scope respected
Gaps: MatchWorkflowTemplateUseCase omits CapabilityResult (acceptance partial); migration remote apply not evidenced; TD-ARCH-005 still Open in tech-debt-tracker (doc drift)
Verdict: REQUEST_CHANGES (see Review 2026-06-19 task-12)
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | 8 |
| Architecture consistency | 10 | 8 |
| Product clarity | 10 | 8 |
| Task quality | 10 | 8 |
| Test coverage | 10 | 8 |
| Runtime validation | 10 | 5 |
| Security | 10 | 6 |
| Reliability | 10 | 7 |
| Observability | 10 | 6 |
| AI slop / maintainability | 10 | 8 |
| **Total** | **100** | **72** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: 8/10

Check: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `docs/agents/_shared/`, `docs/decision-log.md`, `docs/open-decisions.md`, active ExecPlans, repo tasks, and Linear links follow the source-of-truth rules in `AGENTS.md`, `docs/exec-plans/PLANS.md`, and `docs/agents/_shared/linear-policy.md`.

Problems found:

- **Fixed (2026-06-19):** `task-02` → Done; `task-04` → In Review; ExecPlan Progress/Linear mapping updated; `docs-compression-refactor.md` archived to `completed/`; OD-004/OD-006 synced in ExecPlan dependencies/risks.
- **Remaining:** `task-10` Linear issue TBD; `task-04` Codex Audit passed — awaiting Human Architect merge/Done.

Recommended fixes:

- Link Linear issue for `task-10` when available.
- Human Architect merge/approve `task-04`; then start `task-12`.

### 2. Architecture Consistency

Score: 8/10

Check: architecture follows `ARCHITECTURE.md`, especially Technology Context, Providers, Boundary Parsing, Model Separation, Side Effects, Runtime Validation, and Forbidden Dependency Edges.

Problems found:

- **Fixed (task-12):** TD-ARCH-002 resolved — `parseBitrixDeal` only in `LoadDealContextUseCase`; `StartWorkflowUseCase` is thin orchestrator.
- **Fixed (task-12):** TD-ARCH-005 decomposition delivered (load/match/get-context use cases); tracker entry still **Open** — doc drift.
- **Pass:** API → use case; no SDK in use cases; match rules unchanged (task-03).
- **Open:** TD-ARCH-001 (rows through ports); TD-ARCH-003 (domain modules bind Supabase).

Recommended fixes:

- Mark TD-ARCH-005 Resolved in `tech-debt-tracker.md` (Docs Maintenance).
- Complete TD-ARCH-001/003 before scaling tasks 05–09.

### 3. Product Clarity

Score: 8/10

Check: product specs follow `docs/product-specs/PRODUCT_SPECS.md`; product judgment follows `docs/PRODUCT_SENSE.md`; V1/V2/V3 and customer-facing behavior are explicit.

Problems found:

- `docs/product-specs/postsale-agent-v1.md` is **Approved** (2026-06-17) and linked from active ExecPlan.
- Design docs exist under `docs/design-docs/` (process map, architecture, Langflow tools, AI security/observability).
- V1 exclusions and sellable MVP documented in decision log and product spec.
- Tasks 05–09 (email, reply ingestion, completion, Bitrix write, policy baseline) not yet implemented — product scope for remaining V1 is clear but not yet validated in code.

Recommended fixes:

- Keep product spec current when tasks 05–09 start; no product doc changes required before that.

### 4. Task Quality

Score: 8/10

Check: repo tasks follow `docs/tasks/_template.md` and link back to active ExecPlans and Linear only as tracking metadata.

Problems found:

- All 11 task files pass `tasks-check` required sections.
- Done: `task-01`, `task-02`, `task-03`, `task-04`, `task-10`, `task-11`. In Review: `task-12`. Ready: `task-05`–`task-09`.
- `task-09` references `npm run test:policies` (not yet in `package.json` — expected until task-09 starts).

Recommended fixes:

- Close `task-04` review; add Linear link for `task-10`.

### 5. Test Coverage

Score: 8/10

Check: tests and validation commands are defined by the active repo task or ExecPlan; stack-specific checks are governed by `.harness/stack.env` and `docs/agents/_shared/validation-commands.md`.

Problems found:

- `npm test` — PASSED: 25 suites, **83 tests** (2026-06-19, task-12 review).
- `npm run build` — PASSED (2026-06-19).
- `npm run lint` — **FAILED** locally (prettier CRLF; Windows checkout); verify CI `harness-check.yml` on push/PR.
- New unit tests: load-deal-context, match-workflow-template, get-workflow-context, workflow-capability helpers; start-workflow regression extended.
- **Gap:** task-09 policy baseline not implemented.

Recommended fixes:

- Implement task-09 policy test harness when tasks 05–08 land.
- Maintain failing-first tests for each remaining V1 task.

### 6. Runtime Validation

Score: 5/10

Check: Runtime Validation is marked in tasks and evidence follows `docs/agents/_shared/runtime-evidence.md` and `docs/OBSERVABILITY.md`.

Problems found:

- Integration tests exist for health, webhooks, and key modules.
- Done tasks (01, 03, 10, 11) include validation commands and partial runtime evidence in History/Final Report sections.
- `task-04` webhook/start-workflow flow has integration tests but task header still `Ready`; full runtime evidence checklist for task-04 not closed in ExecPlan.
- End-to-end production runtime evidence (Bitrix sandbox, Supabase live, n8n webhooks) not systematically linked for all implemented flows.
- `sandbox:bitrix-read` script exists; Bitrix inspect scripts untracked.

Recommended fixes:

- Close task-04 review with runtime evidence links when status is aligned.
- Track dev/sandbox scripts or document validation paths in task-04/task-08.

### 7. Security

Score: 6/10

Check: security-sensitive work follows `docs/SECURITY.md`, `docs/agents/_shared/risk-policy.md`, and the Codex Audit requirements for risky changes.

Problems found:

- `docs/SECURITY.md` populated and aligned with observability/reliability docs.
- **Codex Audit (2026-06-19):** task-04 APPROVED_FOR_HUMAN_REVIEW; WebhookAuthGuard stub documented TD-SEC-002 / OD-007 — must not expose webhooks publicly before task-08.
- `N8N_WEBHOOK_SECRET` in `.env.example` but webhook auth guard not enforcing secret (task-08 scope).
- npm audit reports 41 vulnerabilities (7 high) — not remediated in this score pass.

Recommended fixes:

- Wire webhook auth in task-08; schedule dependency audit remediation.
- Human Architect merge task-04; record PR link in task History.

### 8. Reliability

Score: 7/10

Check: reliability requirements follow `docs/RELIABILITY.md`, especially Idempotency, Retry Rules, failure modes, recovery, and duplicate side-effect prevention.

Problems found:

- Idempotency service + concurrent race tests implemented and passing.
- Side-effect records with duplicate prevention tested.
- Audit events emitted with structured payloads; tests pass.
- Retry policy accepted in decision log; full retry behavior for email/Bitrix side effects not yet implemented (tasks 05–08).
- Reliability patterns strong for implemented cross-cutting layer; incomplete for not-yet-built customer messaging flows.

Recommended fixes:

- Extend idempotency/side-effect patterns to email and Bitrix write tasks without regression.

### 9. Observability

Score: 6/10

Check: observability requirements follow `docs/OBSERVABILITY.md`, especially Runtime Evidence, Audit Events, trace/request IDs, redaction, and operator-visible recovery context.

Problems found:

- Audit event emission implemented with `event_name` structured logs in idempotency, side effects, template import, audit services.
- Request ID propagation tested in audit service specs.
- Runtime evidence links not uniformly attached across all Done tasks in ExecPlan Runtime Evidence section.
- Full trace/request-id propagation through webhook → workflow → side effects not verified end-to-end in production-like environment.

Recommended fixes:

- Link runtime evidence in ExecPlan as tasks close review.
- Validate request_id through webhook integration path in task-04 review.

### 10. AI Slop / Maintainability

Score: 7/10

Check: Cleanup, Review, and Codex Audit use `docs/agents/_shared/review-gates.md` plus mode-specific AI slop checks for duplication, naming drift, YOLO parsing, stale docs, missing links, and unnecessary abstractions.

Problems found:

- **Fixed (2026-06-19):** removed no-op mapper; empty domain modules removed from `AppModule` imports; Bitrix dev scripts documented in `package.json`.
- **Positive:** no `any` in `src/`; no `console.log` in production `src/`.
- **Open:** pass-through use cases; dead exports (`IngestReplyCommand` reserved for task-06); duplicate Bitrix stub/mock providers.

Recommended fixes:

- See `docs/exec-plans/tech-debt-tracker.md` (TD-SLOP-001 and related).

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

Current band: **60–74 — usable, but needs cleanup/review**.

## Update Rules

Update after major architecture changes, large PRs, Codex Audit, Cleanup Mode, Docs Maintenance Mode, before important production releases, or when repeated AI slop is detected.

**Review and merge flow (mandatory):**

- Review Mode must update this file before issuing `APPROVED_FOR_HUMAN_REVIEW` or `APPROVED_FOR_CODEX_AUDIT` for a repo task or PR.
- After Human Architect merge, confirm this file still matches merged task status, ExecPlan progress, checks, and runtime evidence; use Review follow-up or Docs Maintenance if not.
- See `AGENTS.md` → Quality Score At Review And Merge and `docs/agents/modes/review.md` → QUALITY_SCORE Update.

Do not inflate the score. If evidence is missing, score conservatively. Block approval rather than updating optimistically when review evidence is incomplete.

## Current Top Risks

* task-12 uncommitted / no PR — migration not evidenced on remote Supabase.
* MatchWorkflowTemplateUseCase idempotency duplicate returns `already_matched` without status guard (recovery edge case; V2).
* LoadDealContext idempotency key consumed on `parse_failed` — blocks safe retry (V2 recovery).
* Webhook auth stub until task-08; npm audit 41 vulns (7 high).

## Current Top Improvements

* Fix task-12 review findings (CapabilityResult on match; lint/CI; TD-ARCH-005 tracker).
* Codex Audit task-12 (schema + lifecycle refactor).
* Apply migration `20260619100000_task12_workflow_context_columns.sql` on Supabase PROD.
* Start task-05 after task-12 merge.

## History

```text
2026-06-09 - Created - Initial short Docs Maintenance status.
2026-06-09 - Updated - Expanded into compressed Quality Score rubric without scoring unsupported categories.
2026-06-09 - Updated - Compressed category checks by linking to canonical guardrail docs and reflected the active docs compression ExecPlan.
2026-06-19 - Updated - Full evidence-based score after V1 implementation progress (tasks 01–04 partial, 10–11 Done; 73 tests passing). Documented source-of-truth drift, architecture gaps, and review/merge update rule activation.
2026-06-19 - Updated - Cleanup Fala 1–4: docs drift fixed, parser relocated, tech-debt-tracker created, score 63→70.
2026-06-19 - Updated - Review task-04: APPROVED_FOR_CODEX_AUDIT; acceptance criteria met; minor doc/PR hygiene notes recorded.
2026-06-19 - Updated - Codex Audit task-04: APPROVED_FOR_HUMAN_REVIEW; security 5→6; overall 70→71.
2026-06-19 - Updated - Human Architect merge task-04 Done.
2026-06-19 - Updated - Review task-12: REQUEST_CHANGES; architecture 7→8; test 7→8; slop 7→8; overall 71→72.
```
