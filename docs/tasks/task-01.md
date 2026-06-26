# Task: V1 Foundation — NestJS Scaffold, Supabase Schema, Harness Stack Activation

Status: Done  
Stage: Architecture | Contracts | Domain | Persistence | Integration  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-18

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / [SEL-77](https://linear.app/sellgenius-dev/issue/SEL-77)  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
Also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`, `docs/design-docs/postsale-agent-ai-security-observability.md`.

## Context

Why this task exists:

- Business: Postsale Agent V1 requires a NestJS backend and Supabase schema as foundation for all workflow behavior.
- Technical: Repository is currently harness-only with no application code or Node CI checks.
- Current behavior: Documentation and harness scripts only; no runtime.
- Target behavior: NestJS project scaffold, V1 database schema, module skeleton, `.harness/stack.env` NestJS profile, baseline tests runnable.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase / PostgreSQL

Integrations:

- Scaffold ports/adapters only in this task (Bitrix, Langflow, email, Telegram stubs)

Testing/runtime validation tools:

- Jest
- Supertest for health/webhook smoke tests

Deployment target:

- OPEN_DECISION OD-002

Technology assumptions:

- npm package manager
- Supabase migrations in repo (or supabase/migrations/)
- Module folders match design doc codemap

Technology OPEN_DECISIONs:

- OD-002 deployment target (non-blocking)
- OD-008 stack.env activation (resolved in this task when package.json lands)

## Goal

Expected result:

- Runnable NestJS application with domain module skeleton
- Supabase schema for all 14 V1 tables
- `.harness/stack.env` updated to NestJS profile
- Health endpoint and project structure enforcing Controller → UseCase → Service → Repository pattern
- Baseline harness + lint + test + build checks pass

Complete when:

- `npm run build`, `npm run test`, `npm run lint` pass
- `bash ./scripts/harness-check` passes
- All V1 tables exist in migration SQL
- Module folders created per architecture design doc
- No business logic implemented beyond scaffold and shared types/enums

## Scope

Allowed changes:

- Create `package.json`, `tsconfig.json`, NestJS app entry
- Create `src/` tree per codemap in design doc
- Supabase migration files for V1 tables
- Update `.harness/stack.env` to NestJS profile (per `docs/CI_STACK_PROFILES.md`)
- Shared enums: WorkflowStatus, WorkflowEventType, RequirementLabel, EvidenceType, SideEffectType (separate files, no merged enums)
- Repository port interfaces (no implementations required beyond Supabase stub if needed)
- Health controller and module wiring
- `.env.example` with required variable names (no secrets)
- Minimal README section or pointer in existing docs if needed for dev setup

Likely files/areas:

- `src/app/`, `src/api/`, `src/domains/*/`, `src/integrations/`
- `supabase/migrations/` or equivalent
- `.harness/stack.env`
- `package.json`, `nest-cli.json`, `jest.config.js`

## Forbidden Scope

Do not change:

- Product business rules beyond schema shape defined in architecture docs
- n8n workflows (external)
- Langflow flows (external)
- Production credentials

Do not implement:

- Completion policy logic
- Langflow invocation
- Email send
- Bitrix updates
- Template import script (task-02)
- Full webhook business handlers (stub controllers OK)

Do not touch:

- Approved product spec business rules
- Harness documentation structure (except stack.env)

## Business Behavior

Expected:

- Schema supports all V1 entities and audit tables
- WorkflowStatus and WorkflowEventType are separate enums in code and DB
- side_effect_records and idempotency_keys tables exist before any side effect code

Forbidden:

- Implementing completion or escalation policies in this task
- Any customer email or Bitrix write

Edge cases:

- stack.env must not activate before package.json exists (OD-008)

## Technical Requirements

Implementation:

- NestJS modules registered: postsale-workflows, template-import, template-matching, requirements, langflow, email, bitrix, telegram, audit, idempotency, side-effects (skeleton)
- Each domain folder: types/, schemas/, repository/ (ports), use-cases/ (empty or placeholder)
- Supabase tables: template_import_batches, car_templates, car_template_notes, postsale_workflows, workflow_requirements, customer_messages, message_attachments, message_links, requirement_evidence, langflow_runs, outgoing_messages, workflow_events, side_effect_records, idempotency_keys

Architecture:

- Controller → UseCase → Service/Policy → Repository/Integration
- No external SDK imports in use-cases (provider interfaces only)

Model separation:

- DTO: API webhook request shapes (stub)
- Command: placeholder types for StartWorkflowCommand, etc.
- Domain: Workflow, Requirement, Evidence value object stubs
- Persistence: row types matching Supabase schema
- Integration Payload: Bitrix/Langflow stub types
- LLM Output: LangflowOutput stub types with parser interface

Boundary parsing:

- input source: API DTOs (stub parsers)
- parser/schema/mapper: `src/api/parsers/` placeholder
- trusted output type: Command types
- failure mode: 400 for malformed webhook
- forbidden side effects before parse: enforced by no side effect code in this task

Providers:

- auth: WebhookAuthGuard stub
- CRM/connectors: BitrixProvider interface
- telemetry: Logger module
- feature flags: config module stub
- LLM: LangflowProvider interface
- messaging: EmailProvider, TelegramProvider interfaces
- payments: none

## State Changes

Allowed:

- Database schema creation (migrations)
- No runtime workflow state changes in this task

Forbidden:

- Any side effect execution
- Writing to Bitrix or sending messages

Side effects:

- None in this task

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: enum separation test (WorkflowStatus !== WorkflowEventType usage)
- integration: health endpoint returns 200
- regression: harness-check still passes
- forbidden behavior: N/A at scaffold level
- edge case: migration applies cleanly on empty DB (document command)

Test format:

```text
Given: NestJS app bootstrapped
When: GET /health
Then: 200 OK
Forbidden side effect: none
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required (no UI)
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: GET /health returns 200
- no-console-error: not required for scaffold
- sandbox/mock integration: not required in task-01
- structured log/audit event: not required in task-01
- trace/request/workflow ID: not required in task-01
- idempotency: not required in task-01

If NO, reason: N/A — minimal runtime validation applies.

Full workflow runtime validation deferred to task-09.

## Acceptance Criteria

- NestJS app starts locally
- All 14 V1 tables defined in migrations with indexes on workflow_id, bitrix_deal_id, idempotency_key where applicable
- Module skeleton matches design doc
- WorkflowStatus and WorkflowEventType are separate TypeScript enums
- `.harness/stack.env` reflects NestJS profile from CI_STACK_PROFILES.md
- `bash ./scripts/harness-check` passes
- `npm run lint`, `npm run test`, `npm run build` pass
- `.env.example` lists SUPABASE*URL, SUPABASE_SERVICE_ROLE_KEY, BITRIX*_, LANGFLOW\__, EMAIL*\*, TELEGRAM*\*, N8N_WEBHOOK_SECRET placeholders

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

Project-specific (after scaffold):

```bash
npm run lint
npm run test
npm run build
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Establishes schema and architecture boundaries for CRM/messaging/LLM system; high-risk initiative foundation.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- OD-001, OD-002, OD-003, OD-004, OD-005, OD-006, OD-007 (config placeholders only in task-01)

If none blocking: proceed.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: [SEL-77](https://linear.app/sellgenius-dev/issue/SEL-77/task-01-v1-foundation-nestjs-scaffold-supabase-schema-stack-activation)  
Linear status: Done

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: TBD  
Related decisions: `docs/decision-log.md` (2026-06-17 entries)

## History

2026-06-17 - Created - Architect Mode (from Architecture Context Pack)  
2026-06-18 - Updated - Aligned to full `docs/tasks/_template.md`  
2026-06-17 - Updated - Linear issue linked (SEL-77)
2026-06-17 - Done - NestJS scaffold, Supabase migration, stack.env NestJS profile, health endpoint, tests green

## Final Report Template

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Codex Audit required: YES
Linear update:
ExecPlan update:
PR/Diff:
Next recommended mode: Implementation (task-01), then task-02 + task-03 in parallel
```
