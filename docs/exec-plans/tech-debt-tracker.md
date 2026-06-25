# Tech Debt Tracker

Unresolved cleanup and quality items discovered by Cleanup, Review, or Docs Maintenance. Repository source of truth; Linear tracks status only.

## Open Items

```text
ID: TD-ARCH-001
Domain: bitrix
Issue: Persistence *Row types exposed through repository ports into domain services
Impact: Model separation drift; domain services know DB shape
Recommended fix: Map rows ↔ domain at Supabase repository implementations
Risk: Medium
Owner: Implementation / Cleanup
Status: Open
Source: Cleanup scan 2026-06-19
```

```text
ID: TD-ARCH-002
Domain: postsale-workflows
Issue: StartWorkflowUseCase reads Bitrix provider payload fields after readDeal
Impact: Provider payload used beyond single parse boundary
Recommended fix: Use only DealContext or domain errors after parseBitrixDeal
Risk: Medium
Owner: Implementation / Cleanup
Status: Resolved (task-12 — parse boundary only in LoadDealContextUseCase)
Source: Cleanup scan 2026-06-19; resolved task-12 2026-06-19
```

```text
ID: TD-ARCH-003
Domain: nestjs-modules
Issue: Domain modules bind Supabase adapters directly
Impact: Composition root inside domain modules
Recommended fix: Move adapter binding to app/ composition module
Risk: Low
Owner: Cleanup
Status: Open
Source: Cleanup scan 2026-06-19
```

```text
ID: TD-DOCS-001
Domain: tasks
Issue: task-10 Linear issue still TBD
Impact: Tracking gap only; repo task Done
Recommended fix: Create or link Linear issue when convenient
Risk: Low
Owner: Human Architect
Status: Open
Source: Cleanup Fala 1 2026-06-19
```

```text
ID: TD-SEC-001
Domain: security
Issue: npm audit 41 vulnerabilities (7 high)
Impact: Supply chain risk
Recommended fix: npm audit review; remediate without breaking NestJS 10 stack
Risk: Medium
Owner: Implementation
Status: Open
Source: harness-check 2026-06-19
```

```text
ID: TD-SEC-002
Domain: api
Issue: N8N_WEBHOOK_SECRET not enforced (WebhookAuthGuard stub)
Impact: Webhook auth open until task-08
Recommended fix: Wire guard in task-08
Risk: Medium (expected pre-task-08)
Owner: task-08
Status: Open
Source: Cleanup scan 2026-06-19
```

```text
ID: TD-SLOP-001
Domain: maintainability
Issue: Pass-through use cases bypassed by StartWorkflowUseCase direct service calls
Impact: Layer ceremony inconsistency
Recommended fix: Route through use cases or collapse thin wrappers (behavior-preserving)
Risk: Low
Owner: Cleanup
Status: Resolved (2026-06-19 — B1a: workflow orchestrators use CheckIdempotencyUseCase + EmitWorkflowEventUseCase)
Source: Cleanup scan 2026-06-19; resolved architect decision B1a 2026-06-19
```

```text
ID: TD-OBS-003
Domain: observability
Issue: Unmatched reply escalation is structured log only (no workflow_events row; no workflow_id)
Impact: Operator forensics rely on log pipeline until task-08 Telegram/webhook wiring
Recommended fix: task-08 — wire unmatched outcome to operator notification
Risk: Low (accepted for V1 task-06)
Owner: task-08
Status: Open
Source: Codex Audit task-06 2026-06-26
```

```text
ID: TD-OBS-004
Domain: observability
Issue: langflow_run_id not linked in REPLY_ANALYSIS_ACCEPTED workflow_events payload
Impact: Weaker 1:1 correlation between analysis audit event and langflow_runs row
Recommended fix: Include langflow_run_id in audit payload when recorder returns id
Risk: Low
Owner: Implementation
Status: Open
Source: Codex Audit task-06 2026-06-26
```

## Resolved Items

```text
ID: TD-MATCH-001
Domain: postsale-workflows
Issue: Template matching and notes persistence removed (2026-06-23); MatchWorkflowTemplateUseCase returns template_mapping_not_implemented
Impact: All workflow starts escalate on match step; task-05 blocked (OD-015)
Recommended fix: Human Architect defines requirements/notes source; new repo task
Risk: High until OD-015 resolved
Owner: Human Architect / Implementation
Status: Resolved (2026-06-24 — OD-015 wide car_templates + template-matching domain restored; see decision-log)
Source: Docs sync 2026-06-23 (full removal); resolved Cleanup 2026-06-24
```

```text
ID: TD-ARCH-005
Domain: postsale-workflows
Issue: StartWorkflowUseCase monolith orchestrates full start path; capabilities not exposed for agent loop / recovery
Impact: Blocks workflow-wide agent loop (V3); couples n8n happy path to internal steps
Recommended fix: Extract LoadDealContextUseCase; thin start orchestrator; WorkflowStateGuard + capability API per docs/design-docs/postsale-agent-capabilities-agent-loop.md (V2+)
Risk: Low if deferred post-V1; Medium if agent MCP needed early
Owner: Implementation / V2 planning
Status: Resolved (task-12 — LoadDealContextUseCase, MatchWorkflowTemplateUseCase, GetWorkflowContextUseCase, CapabilityResult)
Source: Architecture discussion 2026-06-19; OD-009; resolved task-12 2026-06-19
```

```text
ID: TD-ARCH-004
Domain: bitrix
Issue: domain → api parser import (deal-context.mapper → api/parsers/bitrix-deal.parser)
Impact: Forbidden dependency edge
Recommended fix: Move parser to domains/bitrix/parsers/
Risk: Low
Owner: Cleanup
Status: Resolved (2026-06-19)
Source: Cleanup Fala 2
```

```text
ID: TD-DOCS-002
Domain: harness
Issue: QUALITY_SCORE stale; task status drift; docs-compression active while done
Impact: Agent misrouting
Recommended fix: Docs Maintenance Fala 1
Risk: Low
Owner: Cleanup
Status: Resolved (2026-06-19)
Source: Cleanup Fala 1
```

```text
ID: TD-SCRIPTS-001
Domain: devtools
Issue: Bitrix inspect scripts untracked; npm run aliases missing
Impact: Dev tooling friction
Recommended fix: package.json scripts + track scripts
Risk: Low
Owner: Cleanup
Status: Superseded (2026-06-23 — template tables and modules removed; see decision log)
Source: Cleanup Fala 4
```
