---
name: telegram-for-agents
description: Use when the user wants to connect, read, search, organize, summarize, or act on Telegram chats through Chiho.ai Cloud or a self-hosted tgchats MCP runtime.
license: MIT
metadata:
  author: Chiho
  version: 1.0.0
---

# telegram-for-agents

Use this skill as the Codex plugin entry point for Telegram workflows through Chiho.

## Choose A Path

### Path 1: Chiho.ai Cloud

Use Chiho.ai Cloud when the user wants the hosted setup.

Choose this when:

- the user does not want to manage Telegram `api_id` / `api_hash`
- the user wants hosted runtime and session storage
- the user wants the Chiho.ai web UI for Telegram CRM tables, contacts, tags, tasks, and follow-ups
- the user wants to connect OpenClaw, Codex, Claude Desktop, or another MCP client quickly

Hosted flow:

1. Connect Telegram in [Chiho's web app](https://chiho.ai/signup).
2. Use the Chiho.ai CRM UI for table-based inbox, contact, tag, task, and follow-up workflows.
3. Mint an API token from `https://chiho.ai/profile/agent-access`.
4. Point the MCP client at `https://api.chiho.ai/mcp`.
5. Use hosted MCP tools for reads, CRM mutations, previews, and approved Telegram actions.

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

Start here for local workflows:

- [Local self-hosted skill](../tgchats-local/SKILL.md)
- [Self-hosted examples](../tgchats-local/references/telegram-flows.md)

Rules:

- Prefer local MCP first (`tgchats-mcp`).
- Fall back to `tgchats --json` only when MCP is unavailable.
- Assume one Telegram writer process (`sync tail`) per account/session.

## Tooling Model

- MCP is the transport for agents.
- Skills are the workflow layer on top of MCP.
- Use workflow skills in this plugin for specific jobs like lead qualification, follow-up tasks, exports, investor updates, and group cleanup.
- Use `tgchats-local` for low-level self-hosted command and tool routing.

## Safety

- Telegram session files, session strings, `TELEGRAM_API_HASH`, and API tokens grant sensitive access. Do not expose them unless the user explicitly requests operational details.
- Read before mutating when the user's intent is open-ended.
- For sends, invites, and group leave actions, use preview/approval flows unless policy or the user's instruction clearly allows execution.
- Be explicit about what data is stored locally when using self-hosted sync, CRM metadata, exports, or backups.

## Next Reads

- For local setup and commands: [tgchats-local](../tgchats-local/SKILL.md)
- For installable workflow skills: [Skill Catalog](../../docs/SKILL_CATALOG.md)
- For command contracts: [Command Contracts](../../docs/COMMAND_CONTRACTS.md)
