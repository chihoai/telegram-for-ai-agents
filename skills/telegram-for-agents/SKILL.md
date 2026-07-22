---
name: telegram-for-agents
description: Route Telegram work to either Chiho's hosted OAuth MCP or the separate self-hosted tgchats local runtime. Use when an agent must select the correct Telegram product before reading, searching, organizing, summarizing, or acting on chats.
---

# Telegram for agents

Choose one runtime and avoid duplicate tool registrations.

## Chiho Telegram

Use the hosted package by default when the user has or wants a Chiho account.

- Connect to `https://api.chiho.ai/mcp` through browser OAuth.
- Never ask an interactive user to mint or paste a personal access token.
- Keep hosted sessions and CRM data in Chiho.
- Use the `chiho-telegram` plugin package for Claude Code and Codex.
- Use the same canonical URL as a custom connector in Claude.ai, Claude Desktop, or Cowork.

Start with `auth.status`, then call the narrowest tool for the user's request. Respect client write prompts and Chiho's preview/approval controls.

## tgchats local

Use the local package only when the user explicitly wants self-hosting.

- Require a built or installed `tgchats-mcp` binary, Telegram API credentials, and local session storage.
- Require Postgres for CRM and sync workflows, and configured AI credentials for AI tools.
- Use the `tgchats-local` plugin package; it launches only the local stdio server.
- Never silently add the hosted Chiho server from the local package.

Follow [the local runtime skill](../tgchats-local/SKILL.md) for detailed local tool routing.

## Safety

- Never expose Telegram sessions, API hashes, OAuth tokens, or service tokens.
- Verify recipients and targets before external Telegram actions.
- Use preview/approval flows for sends, invites, and group leaves.
