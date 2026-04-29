# Telegram Skills Catalog Plan

## Decision

Build the skill catalog in `telegram-for-agents`, not the Chiho monorepo.

`telegram-for-agents` is the public agent-facing package. It already owns the root `SKILL.md`, the self-hosted `tgchats` skill, command docs, MCP contracts, and local CLI runtime. The Chiho monorepo should remain the product/runtime implementation repo: hosted MCP, auth, Telegram account management, CRM state, background jobs, billing, and web UI.

The split should be:

- `telegram-for-agents`: public skills, examples, local CLI/MCP contracts, and agent setup guidance.
- `chiho/monorepo`: hosted Chiho Cloud MCP tools, privileged Telegram mutations, approvals, durable jobs, audit logs, team policies, and UI for installing/running skills.

Assume `chihoai/chiho#9` lands in `staging` and then `main` before high-risk Cloud skills are advertised as executable. That PR changes the Cloud baseline from "read/CRM only" to token-filtered write scopes on the existing `/mcp` endpoint.

The practical rule is:

- Add and maintain Skill directories in `telegram-for-agents`.
- Add hosted execution tools, token scopes, approval UX, audit logs, durable jobs, and team policy UI in `chiho/monorepo`.
- Implement local `tgchats` write tools with the same MCP tool names as Chiho Cloud write tools. CLI command names can be friendlier, but local MCP names should match Cloud MCP.
- Keep shared tool names and schemas aligned so the same Skill works against Chiho Cloud MCP and local `tgchats`.

## Goal

Create a curated "Telegram Skills" layer on top of Chiho Cloud and `tgchats` so agents like OpenClaw, Codex, Claude Desktop, and other MCP clients can discover and execute common Telegram workflows safely.

Skills should follow the Agent Skills ecosystem as closely as practical:

- Anthropic-style `SKILL.md` directories.
- GPT/Codex-compatible workflow instructions.
- The `agentskills.io` `SKILL.md` shape: YAML frontmatter, concise usage guidance, optional `references/`, `scripts/`, and `assets/`.
- Explicit references to MCP tools or CLI commands instead of hidden runtime behavior.

## Product Model

Skills are the workflow layer. MCP and CLI are the execution layer.

```text
skills/<skill-name>/
  SKILL.md
  references/
  scripts/
  assets/

Execution targets:
  Chiho Cloud MCP /mcp
  local tgchats MCP
  tgchats CLI
  Chiho backend jobs
```

Agents should read skills to understand:

- when a workflow applies
- what data to inspect first
- what approvals are required
- which MCP tools or CLI commands to call
- how to preview, execute, and report results
- what failures and Telegram constraints to expect

## Initial Skill Catalog

Start with these high-value workflows.

1. `telegram-bulk-template-message`
   - Sends an approved template to a selected set of chats.
   - Uses `outbox.preview` and `outbox.sendApproved`.
   - Requires `telegram.message.preview`, `telegram.message.send`, and `telegram.batch.write`.
   - Requires preview-first execution, explicit approval unless token policy allows it, rate limits, and audit logs.

2. `telegram-conditional-replies`
   - Creates or runs conditional reply rules.
   - Uses `rules.*` for read/CRM rule setup and write-scoped `message.sendDraft` or `outbox.*` only after preview/dry-run.
   - Requires dry-run mode, rule logs, explicit enablement, and conservative defaults.
   - Should start as task/recommendation generation before automatic message sending.

3. `telegram-add-colleagues-to-group`
   - Adds or invites colleagues to selected group chats.
   - Uses `members.invitePreview` and `members.inviteApproved`.
   - Requires `telegram.members.invite`.
   - Requires permission checks, preview, explicit approval, and clear fallback to invite links.

4. `telegram-followup-tasks`
   - Finds chats needing follow-up and creates CRM tasks.
   - Uses `dialogs.list`, `chat.read`, `tasks.suggest`, `tasks.add`, `rules.*`.
   - Low risk because it mutates Chiho CRM state, not Telegram messages.

5. `telegram-group-cleanup`
   - Finds stale, noisy, or low-value group chats and helps archive, organize, or leave them.
   - Phase 1 uses `dialogs.list`, `chat.read`, `folders.*`, `tags.*`, and task/rule recommendations.
   - Leaving groups uses preview-first `groups.leavePreview` and `groups.leaveApproved`, plus `telegram.groups.leave`.
   - Requires clear dry-run output because group cleanup can remove important context.

Secondary catalog candidates:

- `telegram-group-onboarding`: add a user to a group, send intro/context, tag the resulting chat, and create follow-up tasks.
- `telegram-revive-cold-chats`: find stale chats, draft re-engagement messages, and optionally queue approved sends.
- `telegram-folder-organizer`: create folders and move dialogs into or out of them for a personal Telegram account.

## Skill Directory Standard

Each skill should be an installable directory under `skills/`.

Required:

- `SKILL.md`

Recommended:

- `references/flow.md`
- `references/safety.md`
- `references/cloud-mcp.md`
- `references/tgchats-local.md`
- `assets/examples.json`
- `assets/templates.json`
- `scripts/preview.*` only when a local helper is genuinely useful

Skills should be installable artifacts, not only documentation pages.

Codex/OpenClaw/Claude-style clients need a directory they can ingest, copy, or install into their skill/plugin workspace. The repo should still render well as docs, but the source of truth should be real skill directories:

```text
skills/telegram-bulk-template-message/
  SKILL.md
  references/safety.md
  references/cloud-mcp.md
  references/tgchats-local.md
  assets/templates.json
  assets/examples.json
```

For clients without native skill installation, the same `SKILL.md` files act as documented recipes. For clients with skill support, users should be able to install either the whole catalog or one skill directory.

Frontmatter should use a stable minimum set:

```yaml
---
name: telegram-bulk-template-message
description: Send an approved message template to selected Telegram chats. Use when the user wants to announce, follow up, or message a batch of chats through Chiho.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats runtime with a connected Telegram session.
metadata:
  chiho.category: telegram-automation
  chiho.risk: high
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.message.preview, telegram.message.send, telegram.batch.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(outbox.preview) mcp(outbox.sendApproved)
---
```

Use `allowed-tools` as documentation first, even if a given client treats it as advisory or experimental.

There are four enforcement levels for `allowed-tools`:

1. Advisory metadata only: the model reads `allowed-tools`, but nothing blocks tool use.
2. CI validation: tests verify that every referenced tool exists in Cloud or local contracts.
3. Runtime security: MCP token scopes and dynamic `tools/list` filtering make unauthorized tools unavailable.
4. Skill runner enforcement: a future launcher/proxy refuses calls outside a skill's allowlist.

Recommendation: ship levels 1-3 now. Do not rely on `allowed-tools` for security. Use it for agent guidance and linting, while token scopes enforce the real boundary. Add level 4 later if Chiho builds a first-party skill runner.

## Safety Model

Telegram write actions must be preview-first.

High-risk actions include:

- sending messages
- replying automatically
- adding users to groups
- exporting invite links
- leaving groups
- bulk tagging or bulk CRM mutation

For high-risk skills, the default execution flow is:

1. Read the target chats and relevant history.
2. Produce a structured preview.
3. Ask for explicit user approval when policy requires it.
4. Execute through a typed Chiho tool or queued backend job.
5. Rate-limit and deduplicate with idempotency keys.
6. Persist audit logs with inputs, targets, results, failures, and timestamps.
7. Return a concise execution report to the agent.

High-risk execution should always create a preview record first. Approval mode controls whether a human confirmation is required, not whether preview/audit exists.

UX by approval mode:

- `ask_always`: agent creates preview, user reviews recipients/content/actions in Chiho or the client, then execution uses `previewId`.
- `ask_for_batches`: single low-risk sends may execute directly, but bulk sends, group invites, and group cleanup actions still require preview confirmation.
- `never_ask`: agent still creates preview and gets a `previewId`, then immediately calls the approved execution tool. The user does not click confirm, but audit logs, idempotency, skipped-target reporting, and rate limits remain consistent.

Chiho Cloud MCP should stay token-filtered. Privileged Telegram mutations must require explicit capability scopes and should only appear in `tools/list` for tokens that can use them.

After PR 9, the preferred Cloud model is one `/mcp` endpoint with dynamic token-based tool filtering. Local `tgchats` should expose equivalent tools over stdio MCP and CLI commands, but the Skill should describe the approval and preview flow once.

## Runtime Capabilities

Cloud write tools available after PR 9:

- `outbox.preview`
- `outbox.sendApproved`
- `message.sendDraft`
- `members.invitePreview`
- `members.inviteApproved`
- `folders.create`
- `folders.addDialog`
- `folders.removeDialog`

Local `tgchats` should implement the same write tool names:

- `outbox.preview`
- `outbox.sendApproved`
- `message.sendDraft`
- `members.invitePreview`
- `members.inviteApproved`
- `folders.create`
- `folders.addDialog`
- `folders.removeDialog`

Cloud capability scopes available after PR 9:

- `telegram.read`
- `crm.write`
- `telegram.message.preview`
- `telegram.message.send`
- `telegram.message.schedule`
- `telegram.batch.write`
- `telegram.members.invite`
- `telegram.folders.write`
- `telegram.groups.leave`
- `automation.rules.write`

Still needed before fully productizing skills:

- `outbox.status` or an equivalent run-status lookup for long-running batch sends.
- `rules.enable`, `rules.disable`, and `rules.update` if conditional-reply skills become persistent automations.
- Skill validation that checks frontmatter, local links, and referenced tool names against current contracts.

## Message Templates

Packaged message templates live in skill `assets/templates.json`.

Cloud can import those packaged templates into database records when a user installs/enables a skill, but the versioned source should remain inside the skill package.

Recommended rule:

- `assets/templates.json`: packaged defaults, examples, and portable skill fixtures.
- Chiho Cloud database: user/team-customized copies, approval state, usage stats, and template history.
- Skill docs must never require free-form generated message sending when an approved template exists.

## Team Policy Recommendation

Chiho Cloud should support team-level skill policies and per-account permission scopes before broad team rollout.

Recommended Cloud policy model:

- Token scopes remain the hard permission boundary.
- Team admins can allow/block skills per team.
- Team admins can allow/block write scopes per Telegram account.
- Team admins can force approval modes for high-risk skills, for example `ask_always` for bulk messages and member invites.
- Team admins can restrict skills to approved templates imported from `assets/templates.json`.
- Every run writes an audit record visible to the user and, for team scopes, team admins.

This avoids mixing three concerns: the agent's requested workflow, the token's technical scope, and the team's operational policy.

## Repository Workstreams

### `telegram-for-agents`

- Add the five initial skill directories under `skills/`.
- Add a skill catalog index in `README.md` or `docs/`.
- Document the skill directory standard.
- Sync or mirror Cloud write tool contracts after PR 9 so Skill docs can reference exact tool names.
- Extend `docs/tool-contracts.json` when local MCP/CLI gains equivalent execution tools.
- Add smoke tests that verify every skill has valid frontmatter and local links.
- Add compatibility metadata per skill: Cloud MCP, local MCP, local CLI, required scopes, and approval mode expectations.
- Add install guidance for Codex/OpenClaw/Claude-style clients: install whole catalog, install one skill directory, or read directly as docs.

### `chiho/monorepo`

- Keep hosted token auth and Telegram session verification in the existing backend/auth split.
- Treat PR 9 write-scope tools as the Cloud baseline once merged.
- Continue adding privileged scoped tools only when approval, audit, and rate-limit behavior is ready.
- Maintain `groups.leavePreview` and `groups.leaveApproved` parity for group cleanup.
- Implement durable jobs for write-heavy or bulk flows.
- Surface installed/available skills in the Chiho UI if productized.
- Keep public MCP messaging conservative through token scopes, dynamic tool filtering, preview storage, idempotency, and audit logs.
- Add team policy controls for skill enablement, per-account scope grants, and forced approval modes.

## Milestones

### Milestone 1: Catalog Skeleton

- Add `docs/SKILL_CATALOG.md`.
- Add `skills/telegram-bulk-template-message/SKILL.md`.
- Add `skills/telegram-conditional-replies/SKILL.md`.
- Add `skills/telegram-add-colleagues-to-group/SKILL.md`.
- Add `skills/telegram-followup-tasks/SKILL.md`.
- Add `skills/telegram-group-cleanup/SKILL.md`.
- Add validation for skill frontmatter and links.
- Add a contract reference table that marks PR 9 Cloud write tools as available after staging/main merge.

### Milestone 2: Installable Skill Artifacts

- Make every initial skill directory installable as a standalone artifact.
- Add examples for OpenClaw, Codex, and Claude Desktop.
- Add a simple compatibility table: Cloud, local MCP, local CLI.
- Keep `assets/templates.json` as the source of packaged message templates.

### Milestone 3: Preview-First Write Contracts

- Import or document PR 9 Cloud contracts for outbox, member invite, direct message, and folder write tools.
- Maintain local `tgchats` MCP parity using the same tool names.
- Keep `groups.leavePreview` and `groups.leaveApproved` contracts aligned for group cleanup.
- Add examples showing token scopes and approval modes required for Cloud execution.

### Milestone 4: High-Risk Telegram Skills

- Make `telegram-bulk-template-message` executable with preview IDs.
- Make `telegram-add-colleagues-to-group` executable with preview IDs.
- Make `telegram-conditional-replies` dry-run first, then explicit enablement.
- Make `telegram-followup-tasks` usable with read/CRM scopes.
- Make `telegram-group-cleanup` executable with preview IDs for group leave actions.
- Require explicit approval in every skill instruction unless token/team policy explicitly allows automatic execution.
- Gate Cloud execution examples on the relevant PR 9 capability scopes.

### Milestone 5: Productization

- Add skill catalog discovery in Chiho UI.
- Let users install/enable approved skills per account/team.
- Add team policy controls for skill enablement, per-account scope grants, and forced approval modes.
- Add logs, run history, and rollback/follow-up affordances.
- Import packaged templates from skill `assets/templates.json` into Cloud records when a user installs or enables a skill.
- Add templates and examples for common sales, community, recruiting, and support workflows.

## Resolved Product Decisions

- Local `tgchats` MCP should implement PR 9 write tools with the same names as Cloud MCP.
- Initial high-value skills are `telegram-bulk-template-message`, `telegram-conditional-replies`, `telegram-add-colleagues-to-group`, `telegram-followup-tasks`, and `telegram-group-cleanup`.
- Skills should be installable artifacts shipped as directories, while remaining readable as docs.
- Chiho Cloud should support team-level skill policies and per-account permission scopes for team rollout.
- `allowed-tools` should be advisory plus CI-validated now; token scopes remain the real enforcement. A first-party skill runner can enforce tool allowlists later.
- Packaged message templates live in skill `assets/templates.json`.
- High-risk execution should still use preview records even when approval mode is `never_ask`; the difference is that execution proceeds automatically after preview creation.

## Remaining Questions

- Should Cloud skill installation copy `assets/templates.json` into editable database records, or keep them immutable and versioned from the skill package?
- Which group cleanup actions belong in v1: archive, folder move, mute recommendation, leave group, or all of them?
- Should conditional replies become persistent always-on rules in v1, or remain manual/dry-run recommendations until more policy controls exist?

## Recommendation

Start in `telegram-for-agents` with the five high-value skills as installable artifacts. After PR 9 is merged into `staging` and `main`, reference the new Cloud tool names and required token scopes directly. Use the Chiho monorepo only when a skill needs hosted runtime behavior beyond the skill catalog, such as team policy UI or skill installation UX.

This keeps the agent-facing surface clean, avoids coupling public skill docs to Chiho's internal app structure, and lets Cloud and self-hosted runtimes share one workflow vocabulary.
