# Task: Lean Template Matcher (task-15 implementation)

Status: Cancelled  
Stage: Domain | Use Case | Integration | QA  
Mode: Implementation  
Owner: Implementation agent  
Codex Role: Audit Required  
Risk Level: Medium  
Created: 2026-06-23  
Last updated: 2026-06-23  
Cancelled: 2026-06-23 — Superseded by Human Architect decision to remove all template persistence and matching from V1 (see `docs/decision-log.md`). **OD-015 (2026-06-24)** restored wide-table matching; this lean-matcher task remains cancelled.

## Sources

ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Linear: [Postsale Agent Evapremium V1](https://linear.app/sellgenius-dev/project/postsale-agent-evapremium-v1-56fb7e13e4ec)  
PR: N/A — cancelled before implementation  
Depends on: task-01 (schema) — **template tables dropped** (`supabase/migrations/20260623120000_drop_car_templates.sql`)

## Required Docs

Read: `AGENTS.md`, `docs/agents/runtime-strategy.md`, `ARCHITECTURE.md`, `docs/decision-log.md` (2026-06-23 template removal).  
If risky, also read: `docs/open-decisions.md` (OD-015).

## Context

Why this task existed:

- Business: Restore automated template match after 2026-06-23 module retirement.
- Technical: Rebuild matcher + notes selection against Supabase `car_templates`.
- Current behavior: **Cancelled** — lean matcher not pursued; wide-table OD-015 path implemented in `template-matching` domain (2026-06-24).
- Target behavior: N/A — out of V1 scope until OD-015 defines a new requirements/notes source.

## Technology Context

Application type:

- backend

Framework/runtime:

- NestJS on Node.js

Language:

- TypeScript

Persistence:

- N/A — `car_templates`, `car_template_notes`, `template_import_batches` removed from schema

Integrations:

- N/A

Testing/runtime validation tools:

- N/A

Deployment target:

- N/A

Technology assumptions:

- N/A — task cancelled

Technology OPEN_DECISIONs:

- OD-015 — post-removal requirements/notes source (blocks task-05, not this task)

## Goal

Expected result:

- N/A — cancelled

Complete when:

- N/A — cancelled

## Scope

Allowed changes:

- None — task cancelled

Likely files/areas:

- None

## Forbidden Scope

Do not change:

- Any runtime code under this cancelled task

Do not implement:

- Template import, matching, or notes persistence without new Human Architect approval and ExecPlan update

Do not touch:

- `MatchWorkflowTemplateUseCase` stub unless OD-015 approves a replacement design

## Business Behavior

Expected:

- N/A

Forbidden:

- Re-introducing removed template tables without migration + decision log entry

Edge cases:

- N/A

## Technical Requirements

Implementation:

- N/A

Architecture:

- N/A

Model separation:

- N/A

Boundary parsing:

- N/A

Providers:

- N/A

## State Changes

Allowed:

- None

Forbidden:

- Any writes to removed template tables

Side effects:

- None

Side effects only after validation, boundary parsing, and idempotency check if relevant.

## Testing

Required tests:

- N/A — cancelled

Test format:

```text
N/A — cancelled
```

## Runtime Validation

Runtime Validation: NO

If YES, evidence required: N/A

If NO, reason:

- Task cancelled before implementation; removal validated via `npm test` (53 PASS) and migration file review.

## Acceptance Criteria

- N/A — cancelled
- Harness documents cancellation in ExecPlan and decision log

## Validation Commands

```bash
bash ./scripts/harness-check
```

Stack-specific test, lint, typecheck, build, and runtime checks run only when enabled by `.harness/stack.env`.

## Codex Review Contract

Codex Audit required: NO — cancelled before risky implementation

Review focus:

- N/A

## OPEN_DECISIONs

Blocking:

- OD-015 — requirements input after template persistence removal (affects task-05, not this cancelled task)

Non-blocking:

- None

## Linear Mapping

Linear project: Postsale Agent Evapremium V1  
Linear issue: N/A  
Linear status: Cancelled — do not create

Linear tracks only status, owner, priority, PR link, review/audit state, and progress. Repository task remains implementation source of truth.

## Trace

Related ExecPlan: `docs/exec-plans/active/postsale-agent-v1.md`  
Related PR: N/A  
Related reviews: N/A  
Related QA evidence: N/A  
Related decisions: `docs/decision-log.md` (2026-06-23 template removal)  
Depends on: N/A  
Blocks: N/A (was intended to unblock task-05)

## History

2026-06-23 - Created - Matcher rebuild after module retirement (OD-015)  
2026-06-23 - Cancelled - Full removal of template-matching, car_templates, and related schema; task obsolete

## Final Report Template

```text
Summary: Cancelled — template persistence removed from V1
Changed files: N/A
Checks run: harness-check
Result: N/A
Risks: N/A
OPEN_DECISIONs: OD-015
Codex Audit required: NO
Linear update: N/A
```
