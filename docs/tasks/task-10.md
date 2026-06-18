# Task: Supabase Dedicated Schema Migration — postsale_agent_evapremium

Status: Done  
Stage: Persistence | Integration  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: High  
Created: 2026-06-17  
Last updated: 2026-06-17

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec) / TBD  
PR: TBD

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/agents/modes/implementation.md`, `docs/product-specs/postsale-agent-v1.md`, `docs/design-docs/postsale-agent-architecture.md`, `docs/decision-log.md`, `docs/open-decisions.md`.  
If risky, also read: `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/OBSERVABILITY.md`.

## Context

Why this task exists:

- Business: Postsale Agent V1 persistence must live on the EVAPREMIUM Supabase PROD instance without colliding with existing `public` shop/n8n tables.
- Technical: task-01 defined V1 DDL in repo (`supabase/migrations/20260617000000_v1_foundation.sql`) targeting implicit `public` schema; remote Supabase PROD already has an empty `postsale_agent_evapremium` schema from an earlier migration stub but no V1 tables.
- Current behavior: Local migration SQL exists; NestJS Supabase client uses default `public` schema; remote dedicated schema is empty.
- Target behavior: All 14 V1 tables and enums exist in `postsale_agent_evapremium`; NestJS client targets that schema; migration applied and verified on Supabase PROD.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- Supabase / PostgreSQL, dedicated schema `postsale_agent_evapremium`

Integrations:

- Supabase MCP / migration apply for remote DDL

Testing/runtime validation tools:

- Jest (existing integration tests against mocked Supabase client)
- Supabase `list_tables` / SQL verification after apply

Deployment target:

- Supabase project `PROD` (`kmepxyervpeujwvgdqtm`, eu-central-1)

Technology assumptions:

- Backend uses `SUPABASE_SERVICE_ROLE_KEY` (not anon PostgREST for V1 writes)
- Schema name `postsale_agent_evapremium` matches existing remote schema stub
- Local repo migration is source of truth for table/column/enum shapes from task-01

Technology OPEN_DECISIONs:

- None blocking for schema name (uses existing remote schema)

## Goal

Expected result:

- Repo migration SQL creates all V1 objects inside `postsale_agent_evapremium`
- NestJS `createSupabaseClient()` reads `SUPABASE_DB_SCHEMA` (default `postsale_agent_evapremium`)
- Remote Supabase PROD has all 14 tables, 9 enums, indexes, and service_role grants
- Verification query confirms object counts match task-01 specification

Complete when:

- Migration applied successfully on Supabase PROD
- `list_tables` shows 14 tables in `postsale_agent_evapremium`
- `.env.example` documents `SUPABASE_DB_SCHEMA`
- Existing unit/integration tests still pass
- `bash ./scripts/harness-check` passes

## Scope

Allowed changes:

- Update or add files under `supabase/migrations/`
- Update `src/integrations/supabase/supabase.client.ts` for schema option
- Update `.env.example` with `SUPABASE_DB_SCHEMA`
- Apply migration to Supabase PROD via Supabase MCP
- Update ExecPlan task list and progress for task-10

Likely files/areas:

- `supabase/migrations/20260617000000_v1_foundation.sql` (schema-qualified DDL)
- `src/integrations/supabase/supabase.client.ts`
- `.env.example`
- `docs/exec-plans/active/postsale-agent-v1.md`
- `docs/tasks/task-10.md`

## Forbidden Scope

Do not change:

- Table/column/enum business definitions from task-01 (shape only, schema placement changes)
- Product business rules, completion policy, or workflow logic
- Existing `public` schema tables on Supabase PROD (shop, n8n, orders, etc.)
- n8n workflows, Langflow flows, Bitrix wiring

Do not implement:

- RLS policies (backend uses service role; document as follow-up if PostgREST exposure needed)
- Data seeding or EVAMATS import (task-03)
- New domain use cases

Do not touch:

- Approved product spec business rules
- Unrelated domain modules

## Business Behavior

Expected:

- All V1 persistence objects isolated in `postsale_agent_evapremium`
- No naming collision with `public` tables on shared Supabase instance
- Repository `.from('table_name')` calls resolve against configured schema via Supabase JS client

Forbidden:

- Creating duplicate tables in `public`
- Dropping or altering unrelated remote schemas/tables
- Writing workflow/customer data in this task (DDL only)

Edge cases:

- Remote schema already exists empty — migration must be idempotent (`IF NOT EXISTS` where safe)
- `pgcrypto` extension lives in `extensions` schema on Supabase — use `gen_random_uuid()` as in task-01

## Technical Requirements

Implementation:

- PostgreSQL schema: `postsale_agent_evapremium`
- 9 enums: workflow_status, workflow_event_type, requirement_label, requirement_status, evidence_type, side_effect_type, side_effect_record_status, template_match_status, message_direction
- 14 tables: template_import_batches, car_templates, car_template_notes, postsale_workflows, workflow_requirements, customer_messages, message_attachments, message_links, requirement_evidence, langflow_runs, outgoing_messages, workflow_events, side_effect_records, idempotency_keys
- Indexes from task-01 preserved (workflow_id, bitrix_deal_id, idempotency_key unique, etc.)
- Grants: `USAGE` on schema and `ALL` on tables/sequences to `service_role` and `postgres`
- Supabase JS: `createClient(url, key, { db: { schema: process.env.SUPABASE_DB_SCHEMA ?? 'postsale_agent_evapremium' } })`

Architecture:

- Persistence layer remains behind repository ports; only client factory changes
- No use-case or controller changes unless tests require env stub

Model separation:

- DTO: unchanged
- Command: unchanged
- Domain: unchanged
- Persistence: row types unchanged (table names same, schema external to TS types)
- Integration Payload: unchanged
- LLM Output: unchanged

Boundary parsing:

- input source: N/A (DDL task)
- parser/schema/mapper: N/A
- trusted output type: N/A
- failure mode: migration apply fails loudly; no partial silent state
- forbidden side effects before parse: no application runtime side effects in this task

Providers:

- auth: unchanged
- CRM/connectors: unchanged
- telemetry: unchanged
- feature flags: unchanged
- LLM: unchanged
- messaging: unchanged
- payments: none

## State Changes

Allowed:

- Remote DDL: create enums, tables, indexes, grants in `postsale_agent_evapremium`

Forbidden:

- DML on production business data
- CRM or customer messaging side effects

Side effects:

- Supabase schema DDL on PROD instance only (no row writes)

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- unit: existing Supabase repository tests continue to pass (mocked client)
- integration: existing cross-cutting integration tests pass
- regression: harness-check, lint, test, build
- forbidden behavior: no tables created in `public` on remote apply
- edge case: client factory uses configured schema name

Test format:

```text
Given: Supabase PROD with empty postsale_agent_evapremium schema
When: migration apply runs
Then: 14 tables and 9 enums exist in postsale_agent_evapremium
Forbidden side effect: no public schema V1 tables created
```

## Runtime Validation

Runtime Validation: YES

If YES, evidence required:

- Playwright/browser: not required
- Chrome DevTools MCP: not required
- screenshot/DOM snapshot: not required
- API/network: not required
- no-console-error: not required
- sandbox/mock integration: not required
- structured log/audit event: not required
- trace/request/workflow ID: not required
- idempotency: not required
- Supabase MCP: `list_tables` for `postsale_agent_evapremium` shows 14 tables; SQL count query matches

If NO, reason: N/A

## Acceptance Criteria

- `postsale_agent_evapremium` schema contains all 14 V1 tables with task-01 column definitions
- All 9 enums created in dedicated schema
- Indexes on workflow_id, bitrix_deal_id, idempotency_key (unique) present
- `service_role` has USAGE + table privileges on schema
- NestJS Supabase client configured with `SUPABASE_DB_SCHEMA`
- `.env.example` updated
- Migration recorded in Supabase PROD migration history
- `npm run test`, `npm run lint`, `npm run build`, `bash ./scripts/harness-check` pass

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
npm run lint
npm run test
npm run build
```

Remote verification (Supabase MCP):

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'postsale_agent_evapremium' AND table_type = 'BASE TABLE';
-- expected: 14
```

## Codex Review Contract

Codex must review task alignment, scope and forbidden scope, acceptance coverage, tests/runtime evidence, boundary parsing, architecture boundaries, model separation, hidden side effects, security/reliability/observability, Linear source-of-truth violations, ExecPlan updates, and AI slop/golden-rule violations.

Codex Audit required: YES  
Reason: Database migration on shared production Supabase instance; DDL and grant mistakes could affect co-located workloads or expose data.

## OPEN_DECISIONs

Blocking:

- None

Non-blocking:

- RLS policies for `postsale_agent_evapremium` if anon/authenticated PostgREST access is needed later (V1 uses service role only)

If none blocking: proceed.

## Linear Mapping

Linear project: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
Linear issue: TBD  
Linear status: TBD

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: TBD  
Related reviews: TBD  
Related QA evidence: Supabase MCP table listing after apply  
Related decisions: task-01 schema shape

## History

2026-06-17 - Created - Task Designer / Implementation (user request: migrate local schema to Supabase dedicated schema)  
2026-06-17 - Done - Migration applied to Supabase PROD; 14 tables + 9 enums verified; client schema config added

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
Next recommended mode: Implementation (task-03) or Review
```
