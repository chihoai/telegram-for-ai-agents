---
name: chiho-telegram
description: Choose and configure either Chiho's hosted OAuth Telegram MCP or the separate self-hosted tgchats local runtime. Trigger when a user asks to connect Claude, Codex, ChatGPT, or another MCP client to Telegram and needs the correct hosted-versus-local product path.
---

# Chiho Telegram

Choose exactly one runtime. Never configure both packages implicitly because duplicate Telegram tools make client behavior ambiguous.

## Hosted: Chiho Telegram

Prefer the hosted package unless the user explicitly wants to self-host.

- MCP URL: `https://api.chiho.ai/mcp`
- Authentication: browser OAuth discovered from the server
- Telegram session and CRM: hosted by Chiho
- Package: `plugins/chiho-telegram`
- Interactive onboarding: never uses a personal access token

Connect Telegram at `https://chiho.ai`, install or add the hosted connector, authenticate in the browser, and start with `auth.status`.

Claude.ai, Claude Desktop, and Cowork users can add `https://api.chiho.ai/mcp` as a custom connector. Claude Code and Codex users can install the hosted package from this repository's `chiho` marketplace.

Advanced service tokens belong only to explicitly requested headless automation. Do not offer them as an alternative when interactive OAuth needs troubleshooting.

## Self-hosted: tgchats local

Choose the local package only when the user wants local data ownership and will operate their own Telegram runtime.

- Transport: local stdio MCP
- Authentication: user-owned Telegram API credentials and local session
- Storage: local session plus optional Postgres CRM database
- Package: `plugins/tgchats-local`
- Hosted Chiho endpoint: not configured

Build or install the `tgchats-mcp` binary before installing this plugin. Then follow the packaged `tgchats-local` skill for runtime prerequisites and tool routing.

## Safety boundary

- Never expose Telegram API hashes, session strings, session databases, OAuth tokens, or service tokens.
- Respect client write prompts and server preview/approval flows.
- Read the current state before an open-ended mutation, but do not add unrelated reads before an explicit action.
- Stop on stale authentication and direct the user to the relevant hosted or local reconnect flow.
