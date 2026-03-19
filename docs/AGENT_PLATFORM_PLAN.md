# Agent Platform Plan

This repo is the canonical local runtime for the dual-surface agent strategy.

## Local architecture

- `src/contracts/`: canonical tool names and MCP input schemas
- `src/core/`: shared CLI runner and tool dispatch logic
- `src/mcp/`: local `stdio` MCP adapter
- `src/commands/`: CLI command handlers and local runtime behavior

## Local agent surfaces

- Human/debug surface: `tgchats`
- Local agent surface: `tgchats-mcp`
- Fallback machine-readable surface: `tgchats --json`

## Shared tool names

- `auth.status`
- `account.whoami`
- `dialogs.list`
- `chat.read`
- `folders.list`
- `session.logout`

## Local-only tool names

- `search.messages`
- `folders.update`
- `tags.get`, `tags.set`, `tags.suggest`
- `company.get`, `company.link`, `company.suggest`
- `tasks.today`, `tasks.add`, `tasks.done`, `tasks.suggest`
- `summary.show`, `summary.refresh`
- `nudge.generate`
- `rules.list`, `rules.add`, `rules.run`, `rules.log`
- `sync.backfill`, `sync.once`

## Boundaries

- Local/self-hosted users provide their own Telegram app credentials
- Session persistence remains local through `TELEGRAM_SESSION_PATH`
- `sync tail` remains the single long-running writer per account
- Message sending is intentionally not exposed as an MCP tool in this iteration
