# Task: V1 Policy Test Baseline — 15 Cases + Runtime Validation

Status: Done — merged PR #6 (2026-06-26)  
Stage: QA | Observability  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-19

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-84](https://linear.app/sellgenius-dev/issue/SEL-84)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/agents/modes/qa.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`, `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: V1 success criteria require 15 policy tests proving safe behavior including forbidden outcomes (incomplete reply ≠ complete, VALID requires evidence).
- Technical: Dedicated policy/integration test suite with mocked external providers and runtime evidence assertions.
- Current behavior: Unit tests per module without full baseline coverage.
- Target behavior: `npm run test:policies` runs all 15 baseline cases; ExecPlan runtime evidence checklist satisfied.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Test fixtures / mocked repositories (no production DB in CI)

Integrations:

- Mocked BitrixProvider, EmailProvider, LangflowProvider, TelegramProvider

Testing/runtime validation tools:

- Jest policy suite under `src/tests/policies/` or `test/policies/`
- Supertest for webhook flows where applicable

Deployment target:

- OPEN_DECISION OD-002 (non-blocking)

Technology assumptions:

- task-01 through task-08 features wired
- No production credentials in CI

Technology OPEN_DECISIONs:

- OD-001, OD-003, OD-004, OD-005 mocked until production wiring confirmed

## Goal

Expected result:

- One describe block or file per baseline case (1–15)
- Shared fixtures: deal, template, requirements, replies
- `npm run test:policies` script
- Runtime evidence assertions (workflow_events, side_effect_records, langflow_runs)
- ExecPlan progress updated for V1 validation

Complete when:

- All 15 cases pass in CI
- Forbidden behavior tests assert no forbidden side effect
- Case 14 validates forbidden Langflow direct side-effect tools

## Scope

Allowed changes:

- Policy test files and fixtures
- Test utilities (buildWorkflow, mockLangflowResponse, etc.)
- Minimal production fixes if tests reveal gaps (fix scope only)
- `package.json` script `test:policies`
- ExecPlan progress section update
- Test README for running policy suite

Likely files/areas:

- `src/tests/policies/baseline-01-duplicate-trigger.spec.ts` (or grouped files)
- `src/tests/fixtures/workflows/`
- `src/tests/helpers/mock-providers.ts`

## Forbidden Scope

Do not change:

- Business policies except minimal fixes proven by failing tests
- Product spec acceptance criteria definitions

Do not implement:

- New V2 features (portal, fuzzy match, scheduled sync, dashboard)
- Production integration with real Bitrix/email/Langflow/Telegram in CI

Do not touch:

- n8n workflow definitions in external systems

## Business Behavior

Expected:

- All 15 baseline cases from product spec pass

Forbidden:

- Skipping cases due to OPEN_DECISIONs without documented mocks
- Weakening assertions to make tests pass

Edge cases:

- Each case documents Given/When/Then/Forbidden side effect/Runtime evidence

Baseline cases:

| #   | Case                                          |
| --- | --------------------------------------------- |
| 1   | duplicate Bitrix trigger → no second workflow |
| 2   | template not found → escalate                 |
| 3   | ambiguous template → escalate                 |
| 4   | unsafe Langflow notes → escalate              |
| 5   | no initial email before requirements          |
| 6   | unmatched reply → escalate                    |
| 7   | VALID without evidence rejected               |
| 8   | incomplete requirements → no complete         |
| 9   | complete → Bitrix Deale do dodania            |
| 10  | Bitrix failure → COMPLETED blocked            |
| 11  | follow-up only when missing requirements      |
| 12  | max 3 follow-ups → escalation                 |
| 13  | Telegram failure → completion not blocked     |
| 14  | forbidden Langflow direct side-effect tools   |
| 15  | confidence < 0.75 rejected                    |

## Technical Requirements

Implementation:

- Jest policy suite with shared fixtures and provider mocks
- Assert runtime evidence records in integration-style tests
- Case 14 verifies Langflow tool config or NestJS rejection of forbidden tool responses

Architecture:

- Tests invoke use cases or HTTP layer through public boundaries
- No bypass of boundary parsers in tests (except dedicated parser unit tests)

Model separation:

- DTO: test payload fixtures mirroring n8n/Langflow shapes
- Command: built via same parsers as production
- Domain: assert final Domain/workflow state
- Persistence: mock repositories or test DB
- Integration Payload: mocked provider responses
- LLM Output: fixture JSON through production parsers

Boundary parsing:

- input source: test fixtures using production DTOs
- parser/schema/mapper: production parsers under test
- trusted output type: same as production Commands/Domain
- failure mode: assert escalation/rejection paths
- forbidden side effects before parse: assert no side effect when parse fails

Providers:

- auth: WebhookAuthGuard tested in webhook cases
- CRM/connectors: mocked BitrixProvider
- telemetry: assert workflow_events content
- feature flags: none
- LLM: mocked LangflowProvider
- messaging: mocked EmailProvider, TelegramProvider
- payments: none

## State Changes

Allowed:

- Test database fixtures or in-memory mocks only

Forbidden:

- Production Supabase/Bitrix/email/Telegram mutations
- Real customer messages

Side effects:

- Mocked only; assert side_effect_record creation and provider call payloads

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: N/A as primary (this task is the test suite)
- integration: all 15 baseline cases end-to-end through NestJS boundaries
- regression: full `npm run test` suite green
- regression: after task-12 — `StartWorkflowUseCase` still behavior-equivalent; `deal_context_json` populated on happy path start
- regression: standalone use cases invokable in isolation in policy fixtures (CreateRequirements, SendInitialEmail, IngestReply, ApplyCompletionPolicy — not only via start monolith)
- forbidden behavior: explicit assertions in cases 5, 7, 8, 14, 15
- edge case: each case file includes edge preconditions documented

Test format:

```text
Given:
When:
Then:
Forbidden side effect:
Runtime evidence:
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required (no customer portal)
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: Supertest for webhook cases where applicable
- no-console-error: optional
- sandbox/mock integration: all external providers mocked
- structured log/audit event: assert workflow_events, side_effect_records, langflow_runs
- trace/request/workflow ID: assert workflow_id present in audit records
- idempotency: case 1 and side-effect dedup cases

If NO, reason: N/A

Optional manual QA checklist in PR for Human Architect sign-off.

## Acceptance Criteria

- `npm run test:policies` passes all 15 cases
- `npm run test` full suite green
- `npm run lint` and `npm run build` pass
- `bash ./scripts/harness-check` passes
- Case 14 validates forbidden Langflow tools
- Test README documents how to run policy suite
- Policy fixtures document which capability (use case) each case exercises — supports future agent-loop path (OD-009)

## Validation Commands

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

If relevant:

```bash
bash ./scripts/architecture-check
bash ./scripts/docs-check
bash ./scripts/tasks-check
bash ./scripts/plans-check
```

Project-specific:

```bash
npm run test:policies
npm run test
npm run lint
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Final V1 safety verification before production promotion.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-001, OD-003, OD-004, OD-005 — use mocks until production wiring confirmed

If none: None blocking.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-84](https://linear.app/sellgenius-dev/issue/SEL-84/task-09-policy-test-baseline-15-cases-runtime-validation)  
Linear status: Backlog

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD (this task produces QA evidence)  
Related decisions: `docs/decision-log.md` (acceptance criteria, 2026-06-17)  
Depends on: task-01 through task-08  
Blocks: V1 Review / Codex Audit / Human approval gate

## History

2026-06-17 - Created - Task Designer Mode  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-84)
2026-06-19 - Updated - Capability decomposition regression coverage (task-12, OD-009)

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required:
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode:
```
