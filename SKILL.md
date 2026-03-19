---
name: chiho-telegram
description: Entry point for using Chiho with an AI agent. Use when the user wants to connect Telegram to OpenClaw, Codex, Claude Desktop, or another MCP client, and needs to choose between Chiho Cloud and a self-hosted tgchats runtime.
license: MIT
metadata:
  author: Chiho
  version: 1.0.0
---

# chiho-telegram

Use this file as the public starting point for agent access to Telegram through Chiho.

## Choose A Path

### Path 1: Chiho Cloud

Use Chiho Cloud when the user wants the hosted setup.

Choose this when:

- the user does not want to manage Telegram `api_id` / `api_hash`
- the user wants a stable hosted runtime and session storage
- the user wants to connect OpenClaw, Codex, Claude Desktop, or another MCP client quickly

Hosted flow:

1. Connect Telegram in Chiho's web app.
2. Mint an API token from `https://chiho.ai/profile/agent-access`.
3. Point the MCP client at `https://api.chiho.ai/mcp`.
4. Use the hosted MCP tools for reads and explicit CRM mutations.

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
- `AGENTS.md` in this repo is only for coding agents working on the repository itself.

## Current Product Boundary

- Chiho Cloud is the hosted MCP product.
- `tgchats` is the self-hosted runtime.
- Telegram message sending is intentionally out of scope here.

## Next Reads

- For local setup and local commands: [skills/tgchats-local/SKILL.md](./skills/tgchats-local/SKILL.md)
- For self-hosted examples: [Telegram Flows](./skills/tgchats-local/references/telegram-flows.md)
- For human setup and deployment details: [README.md](./README.md)
- For repo contributors and coding agents: [AGENTS.md](./AGENTS.md)
