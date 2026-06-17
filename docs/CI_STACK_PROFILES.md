# CI Stack Profiles

## Purpose

This document explains how SellGenius Harness maps **Technology Context** into executable CI behavior.

| Layer | Role |
| --- | --- |
| Technology Context | Defines the intended stack |
| `.harness/stack.env` | Translates the stack into CI flags |
| `scripts/stack-check` | Runs checks based on those flags |
| `scripts/harness-check` | Aggregates docs, architecture, plans, tasks, and stack validation |

Documentation-only — this file does not activate any stack profile.

## Active Profile

The repository is in **`nestjs`** mode:

```env
APP_STACK=nestjs
APPLICATION_TYPE=backend
LANGUAGE=typescript
PACKAGE_MANAGER=npm

RUN_NODE_CHECKS=true
RUN_PYTHON_CHECKS=false
RUN_PLAYWRIGHT=false

REQUIRE_LINT=true
REQUIRE_TYPECHECK=true
REQUIRE_TEST=true
REQUIRE_BUILD=true
REQUIRE_E2E=false
```

**Meaning:** NestJS backend scaffold is active; `package.json` is required; Node checks run; lint, typecheck, tests, and build are required; Playwright/E2E is not required by default.

## Stack Configuration Flow

```text
Technology Context
→ .harness/stack.env
→ scripts/stack-check
→ scripts/harness-check
→ CI
```

## Flags

### `RUN_*` — check families

| Flag | When `true` |
| --- | --- |
| `RUN_NODE_CHECKS` | Node / package-manager validation |
| `RUN_PYTHON_CHECKS` | Python validation |
| `RUN_PLAYWRIGHT` | Browser / runtime validation |

If a `RUN_*` flag is `false`, that check family must not run.

### `REQUIRE_*` — mandatory checks inside an enabled family

| Flag | When `true` |
| --- | --- |
| `REQUIRE_LINT` | Lint must pass |
| `REQUIRE_TYPECHECK` | Typecheck must pass |
| `REQUIRE_TEST` | Tests must pass |
| `REQUIRE_BUILD` | Build must pass |
| `REQUIRE_E2E` | E2E tests must pass |

A `REQUIRE_*` flag is meaningful only when its related `RUN_*` family is enabled.

## Example Profiles

Examples only — not active unless written into `.harness/stack.env`.

### Next.js

```env
APP_STACK=nextjs
APPLICATION_TYPE=fullstack
LANGUAGE=typescript
PACKAGE_MANAGER=npm

RUN_NODE_CHECKS=true
RUN_PYTHON_CHECKS=false
RUN_PLAYWRIGHT=true

REQUIRE_LINT=true
REQUIRE_TYPECHECK=true
REQUIRE_TEST=true
REQUIRE_BUILD=true
REQUIRE_E2E=true
```

**Expected:** `package.json` required; Node checks run; lint, typecheck, test, and build required; Playwright/E2E may run when E2E is required.

### NestJS

```env
APP_STACK=nestjs
APPLICATION_TYPE=backend
LANGUAGE=typescript
PACKAGE_MANAGER=npm

RUN_NODE_CHECKS=true
RUN_PYTHON_CHECKS=false
RUN_PLAYWRIGHT=false

REQUIRE_LINT=true
REQUIRE_TYPECHECK=true
REQUIRE_TEST=true
REQUIRE_BUILD=true
REQUIRE_E2E=false
```

**Expected:** `package.json` required; Node checks run; lint, typecheck, test, and build required; Playwright/E2E not required by default.

### Python / FastAPI

```env
APP_STACK=fastapi
APPLICATION_TYPE=backend
LANGUAGE=python
PACKAGE_MANAGER=pip

RUN_NODE_CHECKS=false
RUN_PYTHON_CHECKS=true
RUN_PLAYWRIGHT=false

REQUIRE_LINT=true
REQUIRE_TYPECHECK=true
REQUIRE_TEST=true
REQUIRE_BUILD=false
REQUIRE_E2E=false
```

**Expected:** `pyproject.toml` or `requirements.txt` required; Python checks run; lint, typecheck, and tests required when supported by repo scripts; build and E2E not required by default.

## Architect Responsibility

When Technology Context defines or changes the project stack, **Architect Mode** must update `.harness/stack.env` or create an `OPEN_DECISION` if CI stack configuration is unclear. Technology Context and `.harness/stack.env` must not drift.

| ExecPlan selection | `.harness/stack.env` must reflect |
| --- | --- |
| Next.js | Node / TypeScript stack |
| NestJS | Node / TypeScript backend stack |
| FastAPI | Python backend stack |
| Documentation-only | `harness-only` |

## Important Rule

Stack profiles in this document are **examples**. They become active only when `.harness/stack.env` is changed. Changing `.harness/stack.env` is a stack behavior change and must go through Architect Mode, an accepted ExecPlan, and validation.
