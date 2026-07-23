---
name: tgchats-local
description: Use a self-hosted local tgchats MCP runtime for Telegram reads, CRM workflows, synchronization, and guarded writes. Trigger only when the user explicitly wants local data ownership and has installed or built tgchats with their own Telegram API credentials and session storage.
---

# tgchats local

Use this package only for the self-hosted path. It launches the `tgchats-local` stdio MCP server and never connects to `https://api.chiho.ai/mcp`.

## Preconditions

- Build this repository with `npm install && npm run build`, or install `tgchats-mcp` in `PATH`.
- Configure `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`.
- Configure `DATABASE_URL` for CRM, sync, rules, export, or local filtered search.
- Configure either Gemini or an OpenAI-compatible OpenClaw endpoint for AI tools.
- Keep Telegram session files and API hashes secret.

If a precondition is missing, stop and request only that missing setup. Do not fall back to Chiho Cloud from this package.

## Operating rules

- Prefer the local MCP tools; use the JSON CLI only when MCP is unavailable.
- Call the specific requested tool directly. Do not add broad reads before an explicit action.
- Preserve user-supplied limits and execute multi-step requests in order.
- Treat suggest tools with an apply option as writes when applying results.
- Preview sends, invites, and group leaves before execution and verify recipients or targets.
- Assume one writer process per Telegram session.
- Never print session strings, API hashes, or session paths unless the user explicitly asks.

Start with `auth_status` only when connection state is relevant. Use `account_whoami` for identity checks and `dialogs_list` for recent chats.
