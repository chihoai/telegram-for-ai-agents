---
name: chiho-telegram
description: Use Chiho's hosted OAuth-protected Telegram MCP for chat inspection, search, CRM organization, follow-up work, automation, and guarded Telegram actions. Trigger when a user wants Claude, Codex, or ChatGPT to work with the Telegram account already connected at chiho.ai without copying a personal access token.
---

# Chiho Telegram

Use the hosted MCP server at `https://api.chiho.ai/mcp`. Let the client discover OAuth and open the Chiho consent page. Never ask an interactive user to create, paste, or expose a Chiho personal access token.

## Connection workflow

1. Ask the user to connect Telegram at `https://chiho.ai` if they have not already.
2. Authenticate the `chiho-cloud` MCP connection in the browser.
3. Let the user review the client identity, redirect host, Chiho account or team, and complete permission set before consenting.
4. Call `auth_status`, then `account_whoami`, then the narrowest relevant tool.
5. If the user revokes the connection at `https://chiho.ai/profile/agent-access`, stop and ask them to reconnect through OAuth.

OAuth grants all currently supported Chiho capabilities. Continue to respect the client's write prompts and Chiho's server-side approval requirements.

## Operating rules

- Use the `peer` or `peerRef` returned by `dialogs_list` for chat operations.
- For a personal connection with missing chat metadata, call `sync_peer` for only the required peer before CRM, summary, or nudge tools.
- `sync_peer` is unavailable to team-scoped connections. Ask the user to refresh the team's selected chats in Chiho when team metadata is missing.
- Treat tools that can apply AI suggestions as writes even when they can also preview.
- Preview tools prepare approval state but do not execute the represented Telegram action.
- Review recipients and content before sends, users and groups before invites, and groups plus history-clearing choices before leaving.
- Use `write_approve_preview` only after the user reviews the matching preview.
- Treat logout, group leave, deletes, clears, unlinks, and replacements as destructive.
- If Telegram authentication is stale, direct the user to Chiho's Telegram connection UI.

## Product boundary

This package is the hosted Chiho product. It must not launch a local Node process or the self-hosted `tgchats` server. Use the separate `tgchats-local` plugin only when the user explicitly wants to operate their own runtime, database, and Telegram credentials.
