# Quality Score

Tracks repository quality for SellGenius agentic engineering. Used by Review, Codex Audit, Cleanup, Docs Maintenance, and Human Architect. It makes quality visible, inspectable, and improvable, but does not replace tests, review, or Codex Audit.

It helps detect: architecture drift, AI slop, missing tests/runtime evidence, stale docs, weak task definitions, broken source-of-truth links, unsafe side effects, unclear product scope, and missing security/reliability/observability requirements.

## Current Score

Overall score:

```text
__/100
```

Last updated:

```text
2026-06-09
```

Updated by:

```text
Docs Maintenance agent
```

## Score Categories

| Category | Max | Score |
| --- | ---: | ---: |
| Source of truth hygiene | 10 | __ |
| Architecture consistency | 10 | __ |
| Product clarity | 10 | __ |
| Task quality | 10 | __ |
| Test coverage | 10 | __ |
| Runtime validation | 10 | __ |
| Security | 10 | __ |
| Reliability | 10 | __ |
| Observability | 10 | __ |
| AI slop / maintainability | 10 | __ |
| **Total** | **100** | **__** |

## Category Checks

### 1. Source Of Truth Hygiene

Score: __/10

Check: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `docs/agents/_shared/`, `docs/decision-log.md`, `docs/open-decisions.md`, active ExecPlans, repo tasks, and Linear links follow the source-of-truth rules in `AGENTS.md`, `docs/exec-plans/PLANS.md`, and `docs/agents/_shared/linear-policy.md`.

Problems found: `docs/decision-log.md` and `docs/open-decisions.md` contain no accepted or open decisions; `docs/tasks/` contains only `_template.md` and `LINEAR_MAPPING.md`.

Recommended fixes: keep the active docs maintenance ExecPlan current; add real project ExecPlans, repo tasks, product/design docs, PR links, and decision records when implementation work begins.

### 2. Architecture Consistency

Score: __/10

Check: architecture follows `ARCHITECTURE.md`, especially Technology Context, Providers, Boundary Parsing, Model Separation, Side Effects, Runtime Validation, and Forbidden Dependency Edges.

Problems found: not scored in this docs-only update.

Recommended fixes: run `bash ./scripts/architecture-check` before scoring this category.

### 3. Product Clarity

Score: __/10

Check: product specs follow `docs/product-specs/PRODUCT_SPECS.md`; product judgment follows `docs/PRODUCT_SENSE.md`; V1/V2/V3 and customer-facing behavior are explicit.

Problems found: no real project product spec files beyond the standard and template.

Recommended fixes: add product specs before scoring product clarity.

### 4. Task Quality

Score: __/10

Check: repo tasks follow `docs/tasks/_template.md` and link back to active ExecPlans and Linear only as tracking metadata.

Problems found: no implementation task files found beyond `_template.md` and `LINEAR_MAPPING.md`.

Recommended fixes: create implementation-ready repo tasks from the template when work begins.

### 5. Test Coverage

Score: __/10

Check: tests and validation commands are defined by the active repo task or ExecPlan; stack-specific checks are governed by `.harness/stack.env` and `docs/agents/_shared/validation-commands.md`.

Problems found: not scored in this docs-only update.

Recommended fixes: run test inventory before assigning a score.

### 6. Runtime Validation

Score: __/10

Check: Runtime Validation is marked in tasks and evidence follows `docs/agents/_shared/runtime-evidence.md` and `docs/OBSERVABILITY.md`.

Problems found: runtime evidence was not required for this non-behavioral docs update.

Recommended fixes: require evidence links for future runtime-relevant tasks.

### 7. Security

Score: __/10

Check: security-sensitive work follows `docs/SECURITY.md`, `docs/agents/_shared/risk-policy.md`, and the Codex Audit requirements for risky changes.

Problems found: not scored in this docs-only update.

Recommended fixes: run security review/checks before assigning a score.

### 8. Reliability

Score: __/10

Check: reliability requirements follow `docs/RELIABILITY.md`, especially Idempotency, Retry Rules, failure modes, recovery, and duplicate side-effect prevention.

Problems found: not scored in this docs-only update.

Recommended fixes: run reliability review before assigning a score.

### 9. Observability

Score: __/10

Check: observability requirements follow `docs/OBSERVABILITY.md`, especially Runtime Evidence, Audit Events, trace/request IDs, redaction, and operator-visible recovery context.

Problems found: `docs/OBSERVABILITY.md` is populated from requested observability rules and aligned with `docs/SECURITY.md` and `docs/RELIABILITY.md`; implementation evidence is not scored in this update.

Recommended fixes: review the observability source of truth and link runtime evidence as features are implemented.

### 10. AI Slop / Maintainability

Score: __/10

Check: Cleanup, Review, and Codex Audit use `docs/agents/_shared/review-gates.md` plus mode-specific AI slop checks for duplication, naming drift, YOLO parsing, stale docs, missing links, and unnecessary abstractions.

Problems found: repeated agent policy text was reduced by this docs maintenance run; not scored numerically.

Recommended fixes: run cleanup/maintainability review before assigning a score.

## Score Interpretation

```text
90-100 = strong production-ready harness hygiene
75-89  = good, with manageable debt
60-74  = usable, but needs cleanup/review
40-59  = risky; do not scale without cleanup
0-39   = unstable; stop and repair source of truth
```

## Update Rules

Update after major architecture changes, large PRs, Codex Audit, Cleanup Mode, Docs Maintenance Mode, before important production releases, or when repeated AI slop is detected.

Do not inflate the score. If evidence is missing, score conservatively.

## Current Top Risks

* No implementation task files found beyond the template and Linear mapping standard.
* Decision log and open decisions are empty, so accepted/unresolved decision history is not yet inspectable.
* Several categories are intentionally unscored until checks, tests, runtime evidence, and reviews are available.

## Current Top Improvements

* Run docs, tasks, plans, architecture, lint, typecheck, test, and build checks when available.
* Add real project product specs, repo tasks, decision records, and runtime evidence links as implementation work begins.
* Keep shared agent policy docs in `docs/agents/_shared/` current as mode docs evolve.

## History

```text
2026-06-09 - Created - Initial short Docs Maintenance status.
2026-06-09 - Updated - Expanded into compressed Quality Score rubric without scoring unsupported categories.
2026-06-09 - Updated - Compressed category checks by linking to canonical guardrail docs and reflected the active docs compression ExecPlan.
```
