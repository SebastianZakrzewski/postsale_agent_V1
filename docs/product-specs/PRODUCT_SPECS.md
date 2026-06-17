# Product Spec Standard

Product specs define business behavior, process mapping, lifecycle rules, forbidden outcomes, and acceptance criteria for a real project initiative.

Harness-only or documentation-only work may omit a product spec when the active ExecPlan explicitly states it is not a real project initiative.

## Source Of Truth

- Accepted product behavior lives in `docs/product-specs/` with `Status: Approved`.
- Draft product specs are planning artifacts only.
- `docs/decision-log.md` records Human Architect acceptance.
- `docs/open-decisions.md` records unresolved business behavior.

Agents must not treat draft product specs as accepted business rules.

## Draft Vs Approved

| Status | Meaning | May be used for |
| --- | --- | --- |
| `Draft` | Architect-proposed business mapping; not accepted | process mapping, `OPEN_DECISION` refinement, ExecPlan updates, Human Architect review |
| `Approved` | Human Architect accepted business rules | Task Designer scope, implementation tasks, acceptance criteria, forbidden behavior validation |

Human Architect approval is required before a product spec becomes implementation source of truth.

## Required Linkage

Every real project product spec must:

- link to its active ExecPlan in `docs/exec-plans/active/`,
- link to relevant `OPEN_DECISION` entries in `docs/open-decisions.md`,
- state V1 scope and deferred V2/V3,
- separate accepted rules from assumptions and unknowns.

The active ExecPlan must link back to the product spec path.

## Creation Rules

Architect Mode may create product specs as drafts.

Architect Mode must create or explicitly request a product spec draft before a real project ExecPlan can reach `ARCH_READY_FOR_TASK_DESIGNER`.

Architect Mode must not mark `BUSINESS_PROCESS_MAPPING_READY` until Human Architect approves the product spec.

Task Designer and Implementation must not use draft product specs as business rule source of truth.

## Template

Create product specs from:

`docs/product-specs/_template.md`
