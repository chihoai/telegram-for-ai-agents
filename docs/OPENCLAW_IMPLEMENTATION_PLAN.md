# OpenClaw Integration Plan (Local-First)

## Goal

Integrate `tgchats` with OpenClaw in a production-usable way while keeping the current architecture (CLI + mtcute + Postgres) as the source of truth.

## Status Snapshot

Implemented:

- AI mode switch (`gemini` or `openclaw`)
- Local skill package scaffold (`skills/tgchats-local`)
- Machine-readable `--json` outputs for key agent workflows
- Command contracts and validation checklist docs
- Skill structure aligned with Anthropic skill guidance (clear triggers, progressive disclosure, troubleshooting, and validation checklist)

Still iterative:

- Expand JSON coverage to every command (optional)
- Add end-to-end automated integration tests against a live Telegram sandbox account

We will ship both:

- runtime code (this repo)
- OpenClaw skill files (that orchestrate the runtime)

## Scope

In scope:

- Local/self-hosted OpenClaw integration (`skills/tgchats-local`)
- Runtime hardening needed for agent usage
- Docs for both DB setup modes: user-managed Postgres, and platform-provisioned Postgres (including OpenClaw-hosted stacks that provide a DB URL)

Out of scope:

- Remote-hosted skill (`skills/tgchats-remote`) in this plan. Tracked separately: https://github.com/seichris/telegram-for-ai-agents/issues/4

## Architecture

### 1) Runtime (existing product code)

- `tgchats` CLI remains the core execution layer for Telegram + CRM behavior.
- `sync` worker remains the single Telegram writer per account/session.
- Postgres remains the app/CRM store (`DATABASE_URL`).
- mtcute session store remains separate (`TELEGRAM_SESSION_PATH`).

### 2) OpenClaw skill layer

- Add `skills/tgchats-local/` with `SKILL.md`, command wrappers/examples, and env requirements/safety notes.
- Skill invokes local `tgchats` commands and returns structured outputs to the model workflow.

### 3) DB provisioning modes

Both paths should work identically from app perspective:

- Mode A: user provides `DATABASE_URL` (external/managed/self-hosted Postgres)
- Mode B: Postgres URL is provided by OpenClaw deployment stack

The app only consumes `DATABASE_URL`; provisioning source is irrelevant to runtime logic.

## Implementation Phases

### Phase 1: Agent-Ready Runtime Surface

Deliverables:

- Standardize machine-readable output for key commands (`--json` where needed).
- Ensure stable exit codes and actionable errors for automation flows.
- Add/confirm non-interactive-safe commands for auth status (`whoami`), inbox listing, chat reads, and tasks/rules operations.

Tasks:

1. Define JSON response schemas for top workflows.
2. Add parser/formatting tests for new JSON surfaces.
3. Document command contracts.

### Phase 2: Local Skill Package (`skills/tgchats-local`)

Deliverables:

- Installable OpenClaw skill directory.
- Skill instructions for safe usage patterns and command sequencing.
- Mapping of user intents -> concrete command calls.

Tasks:

1. Create `skills/tgchats-local/SKILL.md`.
2. Add examples for daily workflows: morning inbox triage, follow-up queue, tag/company/task updates, and summary/nudge/rules execution.
3. Add troubleshooting section (auth, session path, DB missing, proxy).

### Phase 3: Ops + Deployment

Deliverables:

- Clear deploy docs for local dev and VPS/Coolify with OpenClaw usage.
- Explicit guidance for session persistence and single-writer sync.

Tasks:

1. Document bootstrapping sequence (`auth` -> `db migrate` -> `sync backfill` -> `sync tail`).
2. Document env matrices for both DB provisioning modes.
3. Add backup/restore guidance for Postgres + exports.

### Phase 4: Validation + Release

Deliverables:

- End-to-end test checklist
- Demo script from clean environment

Tasks:

1. Validate first-time install flow.
2. Validate reconnect/restart flow with persistent session volume.
3. Validate key workflows from OpenClaw using local skill.

## Acceptance Criteria

- OpenClaw can use local `tgchats` skill to execute core workflows end-to-end.
- Both DB modes work by setting `DATABASE_URL` only.
- Session persistence behavior is documented and validated.
- Command outputs needed by skill workflows are stable and machine-readable.
- Docs clearly separate local skill mode (in this plan) and remote skill mode (Issue #4).

## Risks and Mitigations

- Telegram session conflicts from multiple writers; mitigation: enforce single `sync tail` writer per account.
- Non-deterministic CLI text output for agent parsing; mitigation: add `--json` command surfaces for skill-critical paths.
- Auth/session loss on redeploy; mitigation: persistent volume plus explicit bootstrap docs.
- DB provisioning confusion; mitigation: one env contract (`DATABASE_URL`) with two documented sourcing options.

## Suggested Milestones

1. M1: JSON command surfaces + tests
2. M2: `skills/tgchats-local` added and documented
3. M3: Coolify/OpenClaw deployment playbook finalized
4. M4: End-to-end validation complete

## Reference

- Anthropic: The Complete Guide to Building Skills for Claude
  - https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
