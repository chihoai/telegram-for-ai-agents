---
name: chiho-telegram
description: Entry point for using Chiho with an AI agent. Use when the user wants to connect Telegram to OpenClaw, Codex, Claude Code, Cowork, Claude Desktop, or another MCP client, and needs to choose between Chiho.ai Cloud and a self-hosted tgchats runtime.
license: MIT
metadata:
  author: Chiho
  version: 1.0.0
---

# chiho-telegram

Use this file as the public starting point for agent access to Telegram through Chiho.

## Choose A Path

### Path 1: Chiho.ai Cloud

Use Chiho.ai Cloud when the user wants the hosted setup.

Choose this when:

- the user does not want to manage Telegram `api_id` / `api_hash`
- the user wants a stable hosted runtime and session storage
- the user wants the Chiho.ai web UI, including the CRM table for organizing Telegram contacts, chats, tags, tasks, and follow-ups
- the user wants to connect OpenClaw, Codex, Claude Code, Cowork, Claude Desktop, or another MCP client quickly

Hosted flow:

1. Connect Telegram in [Chiho's web app](https://chiho.ai/signup).
2. Use the Chiho.ai CRM UI for table-based inbox, contact, tag, task, and follow-up workflows.
3. Mint an API token from `https://chiho.ai/profile/agent-access`.
4. Point the MCP client at `https://api.chiho.ai/mcp`.
5. Use the hosted MCP tools for reads, CRM mutations, previews, and approved Telegram actions.

Rules:

- Prefer this path by default unless the user explicitly wants self-hosting.
- Do not automate the Chiho web UI when MCP is available.
- If hosted tools fail with a stale Telegram session, send the user back to Chiho's Telegram connect UI.

### Path 2: Self-Hosted tgchats

Use self-hosted `tgchats` when the user wants to run their own Telegram worker, database, and MCP server.

Choose this when:

- the user explicitly wants self-hosting
- the user wants local data ownership
- the user is willing to fetch their own Telegram `api_id` / `api_hash`

Start here for the local workflow:

- [Local self-hosted skill](./skills/tgchats-local/SKILL.md)
- [README](./README.md)

Rules:

- Prefer local MCP first (`tgchats-mcp`).
- Fall back to `tgchats --json` only when MCP is unavailable.
- Assume one Telegram writer process (`sync tail`) per account/session.

## Tooling Model

- MCP is the transport for agents.
- Skills are the workflow layer on top of MCP.
- Installable Telegram workflow skills live under [skills/](./skills/) and are indexed by [skills/catalog.json](./skills/catalog.json).
- `AGENTS.md` in this repo is only for coding agents working on the repository itself.

## Current Product Boundary

- Chiho.ai Cloud is the hosted MCP product plus the Chiho.ai web CRM UI.
- `tgchats` is the self-hosted runtime.
- Telegram message sending is in scope through preview and approval flows.

## Next Reads

- For local setup and local commands: [skills/tgchats-local/SKILL.md](./skills/tgchats-local/SKILL.md)
- For installable workflow skills: [Skill Catalog](./docs/SKILL_CATALOG.md)
- For self-hosted examples: [Telegram Flows](./skills/tgchats-local/references/telegram-flows.md)
- For human setup and deployment details: [README.md](./README.md)
- For repo contributors and coding agents: [AGENTS.md](./AGENTS.md)
