# SellGenius Agent Runtime Strategy

How SellGenius Harness assigns agent runtimes. Entry map and hard stops: `AGENTS.md`.

## Core Model

Humans decide. Composer implements. Codex audits. Checks verify. Human Architect approves.

Agents work by role and mode, never as unrestricted actors.

## Context Budget Rules

Use the smallest sufficient context.

Before reading files, state which files are required and why.

Do not read unrelated files.

Do not re-read unchanged documentation if already summarized in this session.

Prefer targeted file inspection over full repository scanning.

Use grep/search first, then open only relevant files.

Keep summaries short.

After each iteration, preserve only:

- changed files
- hypothesis
- test result
- metric delta
- next decision

## Runtime Responsibilities

## Architecture Runtime

Architect Mode may use any approved reasoning-capable model or agent runtime.

Recommended:

- GPT-5.5 / Codex for deep architecture, complex workflows, CRM/ERP integrations, AI agent systems, reliability/security design, and architecture audit.
- Cursor Composer 2.5 for repo-coupled architecture and implementation preparation.
- Codex GPT-5.5 for independent architecture review before risky implementation.

Regardless of runtime, follow `docs/agents/modes/architect.md` and do not implement production code.

### Cursor Composer 2.5 — primary execution

Drafts architecture, designs tasks, creates plans, implements, tests, debugs, fixes, refactors, updates docs, and performs cleanup. It may modify files only in an explicit mode and within active ExecPlan scope.

### Codex — risky production audit

Performs independent PR review for architecture, regressions, test coverage, security, reliability, scope expansion, hidden side effects, `OPEN_DECISION`s, and alternatives. Codex audits by default and must not fix unless explicitly assigned an approved Fix or Implementation task.

### Human Architect — final authority

Owns business and architecture decisions, closes blocking `OPEN_DECISION`s, approves risky production changes, and gives final merge approval. Agents recommend; Human Architect decides.

## Linear Task Intake

Linear may track task discovery, status, priority, owner, links, review state, and progress. It is not a source of truth for architecture, business rules, schemas, API contracts, lifecycle/status behavior, side effects, integrations, AI behavior, idempotency/retry policy, or runtime validation.

Before Implementation, every Linear task must resolve to an accepted repo task in `docs/tasks/` or an active ExecPlan in `docs/exec-plans/active/`; otherwise agents must not implement it. Linear context may become a repo task only in Task Designer Mode. Implementation and Codex approval must use repository sources, never Linear-only requirements.

## Execution Modes

One mode per run: Architect, Task Designer, Implementation, Review, Fix, QA, Cleanup, Docs Maintenance, Codex Audit.

Follow the mode file in `docs/agents/modes/`. Do not mix planning, implementation, review, fixing, and approval in one run unless explicitly instructed.

## ExecPlan Policy

Complex, risky, multi-step, or long-running work must use an ExecPlan in `docs/exec-plans/active/`.

ExecPlans are living documents and must track progress, discoveries, decisions, validation, outcomes, and retrospective notes.

## Risk Policy

Risky production work requires Codex Audit before final approval. Risky work includes CRM writes, customer messaging, pricing/payments, auth/security, database migrations, state changes, external integrations, production data/automation, LLM business behavior, and architecture boundaries.

Non-risky local changes may use Composer Review Mode.

## OPEN_DECISION Policy

Create or report `OPEN_DECISION` when behavior is unresolved. Blocking `OPEN_DECISION`s stop implementation. Only Human Architect may close blocking `OPEN_DECISION`s. Record closed decisions in `docs/decision-log.md`.

## Refactor And Cleanup Policy

Default: Composer executes, Codex audits medium/high-risk refactors, and Human Architect approves. Preserve behavior unless the active ExecPlan explicitly allows behavior change. Production refactors require an active plan, regression tests, checks, review, and Codex Audit for risky or architecture-level refactors.

Agent-generated code must be periodically scanned for drift, duplication, stale docs, broken boundaries, YOLO parsing, local helpers replacing shared utilities, missing runtime evidence, and architecture violations.

Cleanup agents may open small refactor/docs PRs but must not change business behavior.

## Docs Enforcement

Repository knowledge must be mechanically checked. Docs checks should verify required files, required fields, links, stale plans, `OPEN_DECISION` status, Codex Audit requirements, and Runtime Validation evidence.

## Checks And Final Output

```bash
bash ./scripts/harness-check
```

Stack-specific checks run only when enabled by `.harness/stack.env`.

Do not claim success without running or reporting checks. If checks cannot run, report why. Every implementation, fix, review, cleanup, or audit ends with:

```text
Summary:
Changed files:
Checks run:
Result:
Risks:
OPEN_DECISIONs:
Next recommended step:
```
