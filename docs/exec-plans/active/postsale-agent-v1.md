ExecPlan: Postsale Agent EVAPREMIUM V1

Status: Active
Owner: Human Architect
Risk level: High
Created: 2026-06-17
Last updated: 2026-06-17

## Purpose

Build a post-sale agent for EVAPREMIUM that collects required customer information after a Bitrix deal enters the post-sale information collection stage, using NestJS as business process owner, Supabase as source of truth, Langflow for controlled AI, and n8n for triggers and timers.

Business goal:
Automate post-sale information collection via email with safe completion, follow-up, and escalation policies tied to Bitrix deal stages.

Success criteria:
All 15 V1 test baseline cases pass; runtime evidence exists for critical workflow transitions; idempotency prevents duplicate workflows and unsafe side effects.

Must-never-happen:
Incomplete customer reply treated as complete; VALID without evidence; Langflow or n8n bypassing NestJS policies.

## Context

Required source-of-truth docs:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `docs/agents/runtime-strategy.md`
- `docs/product-specs/postsale-agent-v1.md`
- `docs/design-docs/postsale-agent-process-map.md`
- `docs/design-docs/postsale-agent-architecture.md`
- `docs/design-docs/postsale-agent-langflow-tools.md`
- `docs/design-docs/postsale-agent-ai-security-observability.md`
- `docs/decision-log.md`
- `docs/open-decisions.md`

Relevant code areas (target):

- `src/domains/*` — NestJS domain modules
- `src/api/` — webhook controllers
- `src/integrations/` — Bitrix, Langflow, email, Telegram, Supabase adapters
- Supabase migrations / schema
- n8n workflows (external, trigger-only)

Relevant Linear project/issues:

- SEL-73 — Zaprojektować architekturę agenta posprzedażowego

## Technology Context

Application type:

- backend (+ automation adapters via n8n)

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase / PostgreSQL

Integrations:

- Bitrix24 (CRM read/write)
- Langflow (AI classify, draft, analyze)
- n8n (Bitrix stage trigger, email ingress, follow-up timers)
- Email provider (customer messaging)
- Telegram (operator notifications)

Testing/runtime validation tools:

- Jest (unit + integration)
- Policy test suite (15 baseline cases)
- Mock adapters for Bitrix, email, Langflow, Telegram
- Runtime evidence: workflow_events, side_effect_records, langflow_runs

Deployment target:

- OPEN_DECISION OD-002 (non-blocking for implementation start)

Technology assumptions:

- NestJS owns all business logic and side effects
- Langflow has no direct write or messaging capabilities in V1
- n8n does not own validation, idempotency, or completion decisions
- One-time EVAMATS template import into Supabase

Technology OPEN_DECISIONs:

- OD-001 email provider
- OD-002 deployment target
- OD-003 Langflow hosting
- OD-004 Bitrix field mapping
- OD-005 Telegram target
- OD-006 EVAMATS column schema
- OD-007 n8n webhook auth

## Mode / Risk Level

Mode depth: STANDARD
Codex Audit required: YES
Runtime Validation required: YES

## Readiness Gates

Ladder:

```text
ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC
→ BUSINESS_PROCESS_MAPPING_DRAFT
→ BUSINESS_PROCESS_MAPPING_READY
→ ARCH_READY_FOR_TASK_DESIGNER
→ ARCH_READY_FOR_IMPLEMENTATION
```

Current status:

- `ARCH_BLOCKED_BY_MISSING_PRODUCT_SPEC`: MET
- `BUSINESS_PROCESS_MAPPING_DRAFT`: MET
- `BUSINESS_PROCESS_MAPPING_READY`: MET
- `ARCH_READY_FOR_TASK_DESIGNER`: MET
- `ARCH_READY_FOR_IMPLEMENTATION`: MET

Linked product spec:

- path: `docs/product-specs/postsale-agent-v1.md`
- status: Approved

Implementation status:

- READY FOR IMPLEMENTATION

Risk classification:

- CRM writes: YES
- customer messaging: YES
- pricing/payments: NO
- auth/security: YES
- database migrations: YES
- state changes: YES
- external integrations: YES
- production data/automation: YES
- LLM business behavior: YES
- architecture boundaries: YES

## Source Of Truth

This ExecPlan is the planning source of truth for Postsale Agent V1. Product behavior: `docs/product-specs/postsale-agent-v1.md`. Architecture detail: `docs/design-docs/`. Implementation units: `docs/tasks/`. Accepted decisions: `docs/decision-log.md`.

## V1 Scope

V1 includes:

* one-time EVAMATS template import into Supabase
* car template matching (exact + alias)
* template note selection by product + body type
* Langflow classification into requirement labels
* requirements persistence
* initial customer email + reply ingestion
* attachments and links as evidence
* Langflow reply analysis
* completion policy, follow-ups, escalation
* Bitrix stage update and comment
* Telegram operator notification
* audit events, side effect records, idempotency
* runtime validation and 15-case test baseline

V1 excludes:

* image correctness classification
* customer upload portal
* scheduled template sync
* multi-agent architecture
* admin dashboard
* fuzzy matching
* microservices
* CQRS / event sourcing

## Deferred V2/V3

V2 candidates:

* customer upload portal
* scheduled EVAMATS template sync
* fuzzy template matching
* basic operator dashboard
* workflow capability API (`LoadDealContext`, guarded `match_template`, read + `allowed_next_actions`) for recovery/replay — see `docs/design-docs/postsale-agent-capabilities-agent-loop.md`, OD-009

V3 candidates:

* image correctness classification
* multi-agent orchestration and workflow-wide agent loop (level B) — OD-008, OD-010
* full admin dashboard

## Architecture Summary

Domains:

- postsale-workflows, template-import, template-matching, requirements, langflow, email, bitrix, telegram, audit, idempotency, side-effects

Default domain layers:

```text
types/schemas
-> config
-> repository/ports
-> services / policies
-> use-cases
-> runtime/adapters
-> API controllers
```

Providers:

- auth: NestJS webhook guards
- CRM/connectors: BitrixProvider
- telemetry: structured logs + workflow_events
- feature flags: config module (optional V1)
- LLM: LangflowProvider
- messaging: EmailProvider, TelegramProvider
- payments: none

Forbidden dependency edges:

- use-case → external SDK directly
- Langflow → Supabase / Bitrix / email / Telegram
- n8n → Bitrix write or completion without NestJS
- raw LLM output → persistence

Boundary parsing requirements:

- n8n webhooks → DTO → Command before use-case
- Langflow output → schema parser → Domain before policy
- Bitrix payload → DealContext value object before template match

See `docs/design-docs/postsale-agent-architecture.md`.

## Repo Task List

All V1 implementation tasks are defined in `docs/tasks/`. Execute in dependency order.

| Task | Title | Depends on | Status |
| --- | --- | --- | --- |
| task-01 | V1 foundation — NestJS scaffold, Supabase schema, stack activation | — | Done |
| task-02 | Cross-cutting — idempotency, audit events, side-effect records | task-01 | Done |
| task-03 | Template import + car template matching | task-01 | Done |
| task-04 | Workflow start — Bitrix read, template match, escalation paths | task-01, task-02, task-03 | Done |
| task-12 | Workflow capability foundation — schema, start decomposition, CapabilityResult | task-04 | Done |
| task-05 | Requirements + Langflow classification + initial email | task-02, task-12 | Ready |
| task-06 | Reply ingestion, Langflow analysis, evidence storage | task-05 | Ready |
| task-07 | Completion, follow-up, escalation policies | task-06 | Ready |
| task-08 | Bitrix write, Telegram, n8n webhook API | task-02, task-04–07 | Ready |
| task-09 | Policy test baseline (15 cases) + runtime validation | task-01–08 | Ready |
| task-10 | Supabase dedicated schema migration (`postsale_agent_evapremium`) | task-01 | Done |
| task-11 | EVAMATS production data migration (one-time DML) | task-03, task-10 | Done |

Dependency graph:

```text
task-01
  ├── task-02 ─────────────────────────────┐
  └── task-03 ── task-04 ── task-12 ── task-05 ── task-06 ── task-07 ── task-08 ── task-09
                └ (task-02 used from 04 onward)
```

task-12 (capability foundation) refactors start into discrete use cases + persists DealContext; required before task-05. See `docs/tasks/task-12.md` and `docs/design-docs/postsale-agent-capabilities-agent-loop.md`.

Parallel opportunity: task-02 and task-03 may run in parallel after task-01.

Linear mapping (create issues when implementation starts):

- SEL-73 — architecture (Done)
- task-01 … task-12 — repo tasks in `docs/tasks/`; Linear issues linked per task file

## Dependencies

Documentation dependencies:

* Approved product spec and design docs (complete)
* Human Architect acceptance via Architecture Context Pack

Technical dependencies:

* Supabase project provisioned
* Langflow flows deployed (4 V1 flows)
* n8n workflows for Bitrix trigger, email ingress, follow-up timers
* Bitrix24 API access
* Email provider (OD-001)
* Telegram bot (OD-005)

Business dependencies:

* EVAMATS template export for one-time import (OD-006 — implemented via task-11; awaiting Human Architect closure)
* Bitrix field mapping confirmation (OD-004 — resolved 2026-06-18; see `docs/decision-log.md`)

External dependencies:

* Bitrix24, Supabase, Langflow, n8n, email provider, Telegram

Blocking dependencies:

* None for task-01 start

## Progress

- [done] architecture-context-pack - Stages 1–7 documented by Human Architect
- [done] product-spec - postsale-agent-v1.md Approved
- [done] design-docs - process map, architecture, langflow tools, AI/security/observability
- [done] decision-log - accepted decisions recorded
- [done] open-decisions - non-blocking operational items documented
- [done] exec-plan - this plan active
- [done] task-01 - NestJS foundation
- [done] task-02 - idempotency, audit, side-effects
- [done] task-03 - template import + matching
- [done] task-11 - EVAMATS production data migration (one-time DML; PROD 2719/2169 verified)
- [done] task-04 - workflow start + Bitrix read (Human Architect merge 2026-06-19)
- [done] task-12 - workflow capability foundation (schema + start decomposition; merge 2026-06-19)
- [pending] task-05 - requirements + Langflow + initial email
- [pending] task-06 - reply + evidence
- [pending] task-07 - completion / follow-up / escalation policies
- [pending] task-08 - Bitrix write + Telegram + n8n webhooks
- [pending] task-09 - policy test baseline (15 cases)
- [done] task-10 - Supabase dedicated schema migration (postsale_agent_evapremium)
- [done] task-list - all repo tasks task-01..task-09 defined (Task Designer 2026-06-17)

## Surprises & Discoveries

- Repository was harness-only before this initiative; no existing application code.
- Prior active ExecPlan `docs-compression-refactor.md` was harness documentation maintenance (completed; archived to `docs/exec-plans/completed/`).
- task-01 (2026-06-17): NestJS scaffold landed; stack.env switched to nestjs profile; 14-table migration in `supabase/migrations/`.
- task-02 (2026-06-17): IdempotencyService, AuditService, SideEffectService + Supabase repositories; record-before-execute guard; unit/integration tests.
- task-10 (2026-06-17): V1 DDL migrated to dedicated `postsale_agent_evapremium` schema on Supabase PROD; NestJS client uses `SUPABASE_DB_SCHEMA`.

## Decision Log

See `docs/decision-log.md` for accepted decisions, including OD-008 stack.env activation in task-01.

## OPEN_DECISIONs

Blocking: None.

Non-blocking: OD-001 through OD-007 in `docs/open-decisions.md`.

## Validation

Required checks:

```bash
bash ./scripts/harness-check
bash ./scripts/docs-check
bash ./scripts/architecture-check
bash ./scripts/plans-check
bash ./scripts/tasks-check
```

Stack-specific checks are active through the NestJS profile in `.harness/stack.env`.

Additional checks (after NestJS scaffold):

```bash
npm run lint
npm run test
npm run build
```

Acceptance validation:

- All 15 policy test baseline cases pass
- Runtime evidence collected per design doc
- Codex Audit passed before production promotion

Forbidden behavior validation:

- Cases 5, 7, 8, 14, 15 from test baseline
- No side effect before side_effect_record
- No COMPLETED without completion policy pass

Regression validation:

- Idempotency tests on workflow start and side effects
- harness-check green after doc and code changes

## Runtime Evidence

Runtime Validation: YES

Evidence to collect:

- Playwright test: not required (no customer portal)
- API check: n8n webhook endpoints
- sandbox/mock integration: Bitrix, email, Langflow, Telegram
- structured log/audit event: workflow_events, side_effect_records
- trace/request/workflow ID: workflow_id, request_id, idempotency_key
- idempotency evidence: duplicate trigger test, side_effect_record dedup

## Linear Mapping

Linear Project:

- name: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)
- link: https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec
- owner: TBD
- priority: High
- status: In Progress (implementation)

Linear Issues:

| Repo task | Linear issue | Linear status |
|-----------|--------------|---------------|
| Architecture | [SEL-73](https://linear.app/sellgenius-dev/issue/SEL-73) | Done |
| task-01 | [SEL-77](https://linear.app/sellgenius-dev/issue/SEL-77) | Done |
| task-02 | [SEL-76](https://linear.app/sellgenius-dev/issue/SEL-76) | Done |
| task-03 | [SEL-78](https://linear.app/sellgenius-dev/issue/SEL-78) | Done |
| task-04 | [SEL-80](https://linear.app/sellgenius-dev/issue/SEL-80) | Done |
| task-12 | [SEL-85](https://linear.app/sellgenius-dev/issue/SEL-85) | Done |
| task-05 | [SEL-79](https://linear.app/sellgenius-dev/issue/SEL-79) | Backlog (blocked by SEL-85) |
| task-06 | [SEL-81](https://linear.app/sellgenius-dev/issue/SEL-81) | Backlog |
| task-07 | [SEL-82](https://linear.app/sellgenius-dev/issue/SEL-82) | Backlog |
| task-08 | [SEL-83](https://linear.app/sellgenius-dev/issue/SEL-83) | Backlog |
| task-09 | [SEL-84](https://linear.app/sellgenius-dev/issue/SEL-84) | Backlog |
| task-10 | TBD (repo Done) | Done (repo) |
| task-11 | [SEL-78](https://linear.app/sellgenius-dev/issue/SEL-78) (PROD load noted in description) | Done (repo) |

Note: Previous Linear project instance was trashed; active project recreated 2026-06-17.

## Risks

Known risks:

- Langflow classification drift
- Email reply-to matching ambiguity
- Bitrix field mapping errors — mitigated via OD-004 resolution (2026-06-18); validate in task-04 review

Mitigations:

- Schema validation + 0.75 confidence gate
- Unmatched reply → escalation
- Bitrix field map doc before production wiring
- stack.env activated in task-01 after package.json and NestJS scaffold landed

Residual risk after V1:

- No image correctness validation
- Manual template import only

## Outcomes & Retrospective

Fill when the plan is completed or closed.

What shipped:

- TBD

What was deferred:

- TBD

Validation result:

- TBD

Codex Audit result:

- TBD

QA result:

- TBD

Lessons learned:

- TBD

Follow-up tech debt:

- TBD
