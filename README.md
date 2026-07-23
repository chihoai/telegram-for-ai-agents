# telegram-for-agents

`telegram-for-agents` provides two deliberately separate ways to give an agent account-level Telegram access:

- **Chiho Telegram**: hosted MCP at `https://api.chiho.ai/mcp` with browser OAuth.
- **tgchats local**: a self-hosted stdio MCP runtime using your own Telegram credentials and storage.

This is not the limited-access Bot API flow where you add a bot to chats manually.
Your agent works with your real Telegram account, with the same account-level surface you get in Telegram Web or the Telegram apps.

Use it when you want:

- one login instead of manually inviting bots into chats
- full Telegram account access for an agent
- either Chiho.ai Cloud with the hosted web CRM UI, or a self-hosted `tgchats` runtime

Start with [SKILL.md](./SKILL.md).
That is the public entry point for both Chiho.ai Cloud and the self-hosted path.
Use [AGENTS.md](./AGENTS.md) only for coding and contributing inside this repo.

## Features

- One-time Telegram login for full account-level agent access
- No manual bot invites per chat
- Chiho.ai Cloud path includes the hosted CRM table UI for organizing Telegram chats, contacts, tags, tasks, and follow-ups
- Telegram auth with QR-first + phone fallback
- Inbox and per-chat history browsing
- Local MCP server for agent integrations (`tgchats-mcp`)
- Telegram folders management
- CRM metadata: tags, company links, tasks, summaries
- AI-powered suggestions for tags/company/tasks/summaries/follow-ups/rules
- Dual AI execution modes: `gemini` or `openclaw`
- Sync modes: backfill, once, tail
- Export/import for backups

## Self-Hosted Setup

- Node.js 22 or 23
- Telegram API credentials from https://my.telegram.org/apps
- Postgres for app DB (local Docker for dev, managed DB/service on VPS)

```bash
npm install
cp .env.example .env
```

Required env:

```bash
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash_here
```

The local runtime loads configuration from the current directory, the linked
package root, or `~/.config/telegram-for-ai-agents/.env`. Set
`TGCHATS_ENV_PATH` when you want an explicit location. This keeps the same
credentials available when Claude or Codex launches the plugin from its own
installed-plugin cache.

Recommended env:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tgchats
TELEGRAM_ACCOUNT_LABEL=default
```

Optional env:

```bash
TELEGRAM_SESSION_PATH=/Users/you/.config/telegram-for-agents/telegram.session
TELEGRAM_PROXY_URL=socks5://203.0.113.10:1080
```

AI env (choose one mode):

```bash
AI_MODE=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
AI_TIMEOUT_MS=30000
```

```bash
AI_MODE=openclaw
OPENCLAW_BASE_URL=http://localhost:3000
OPENCLAW_API_KEY=optional_token
OPENCLAW_MODEL=openclaw
AI_TIMEOUT_MS=30000
```

`OPENCLAW_BASE_URL` is expected to expose an OpenAI-compatible chat completion endpoint at `/v1/chat/completions`.

Local Postgres:

```bash
docker compose up -d
npm run dev -- db migrate
```

Supported runtimes:

- Node 22 and Node 23 are the supported local runtimes.
- If session storage/bootstrap fails, the CLI now returns an explicit JSON error code instead of an empty wrapper.

## Commands

Quick start:

```bash
npm run dev -- inbox --limit 5
npm run dev -- auth
npm run dev -- whoami
npm run dev -- chat <peer> --limit 50
npm run dev -- open <peer>
npm run dev -- search "pricing" --limit 20
npm run dev -- folders list
npm run dev -- tasks today
npm run dev -- tags suggest <peer> --apply
npm run dev -- company suggest <peer> --apply
npm run dev -- tasks suggest <peer> --apply
npm run dev -- nudge <peer> --style concise
npm run dev -- rules run
npm run dev -- sync backfill --per-chat-limit 100 --dialogs 200
npm run dev -- export --format json --out ./exports/backup.json
```

Equivalent entrypoints:

- Dev: `npm run dev -- <command ...>`
- Built CLI: `node dist/cli.js <command ...>`
- Installed binary: `tgchats <command ...>`

Local MCP server:

```bash
npm run mcp
```

After build:

```bash
./dist/mcp/stdio.js
```

## Agent packages

The repository marketplace exposes two packages. Installing one never configures the other server.

| Package | Runtime | Authentication | MCP configuration |
| --- | --- | --- | --- |
| **Chiho Telegram** (`chiho-telegram`) | Hosted by Chiho | Browser OAuth | `https://api.chiho.ai/mcp` |
| **tgchats local** (`tgchats-local`) | Local stdio process | Local Telegram login | `tgchats-mcp` |

### Codex

Add this GitHub repository as a marketplace, then install exactly one package:

```bash
codex plugin marketplace add chihoai/telegram-for-ai-agents
codex plugin add chiho-telegram@chiho
```

For local self-hosting, build and link the binary first, then install the local package:

```bash
npm install
npm run build
npm link
codex plugin add tgchats-local@chiho
```

Codex shares MCP configuration across the desktop app, CLI, and IDE extension. For the hosted package, select **Authenticate** in MCP settings or run `/mcp` and complete Chiho OAuth in the browser. The package asks Codex to prompt for tools not marked read-only.

### Claude Code

```bash
claude plugin marketplace add chihoai/telegram-for-ai-agents
claude plugin install chiho-telegram@chiho
```

Open `/mcp`, select `chiho-cloud`, and complete browser OAuth. For the self-hosted package, run the same build and `npm link` steps above, then install `tgchats-local@chiho` instead.

### Claude.ai, Claude Desktop, and Cowork

Add a custom connector with this exact URL:

```text
https://api.chiho.ai/mcp
```

Select **Connect** and complete OAuth in the browser. Do not enter a personal access token, custom bearer header, or OAuth client secret. Free, Pro, and Max users can add Chiho directly as a custom connector; Claude Free currently permits one custom connector. Team and Enterprise owners are only required for organization-wide connector installation and directory submission.

Advanced service tokens remain available only for explicitly requested headless automation and are not part of Claude or Codex onboarding.

### Directory publication

Direct custom-connector and marketplace testing does not require directory approval.

- **Anthropic Connectors Directory:** submit from a Claude Team or Enterprise organization as an Owner or Primary Owner at `https://claude.ai/admin-settings/directory/submissions/new`. The Claude plugin is a separate submission from `https://claude.ai/settings/plugins/submit` or `https://platform.claude.com/plugins/submit`.
- **OpenAI Plugins Directory:** complete business verification for the publishing OpenAI Platform organization, use an Owner or a role with Apps Management write access, then create a **With MCP** submission at `https://platform.openai.com/plugins` for `https://api.chiho.ai/mcp`.

OpenAI does not require an existing ChatGPT app ID for a new MCP-backed submission. Both directories require production documentation, privacy and support details, accurate tool metadata, reviewer test instructions, and a production-ready OAuth flow.

Machine-readable surfaces:

- Add `--json` to supported commands
- Contracts: [`docs/COMMAND_CONTRACTS.md`](./docs/COMMAND_CONTRACTS.md)
- Public MCP tool schemas: [`docs/public-mcp-tool-contracts.json`](./docs/public-mcp-tool-contracts.json)
- Self-hosted install check: `npm run check:local-install`
  - optionally set `TGCHATS_SMOKE_PEER=<peerId>` to include one peer-scoped read when a session already exists

Full help:

```bash
npm run dev -- --help
```

Command reference:

Auth and account:

- `tgchats auth`: interactive login (QR first, then phone code/2FA fallback).
- `tgchats auth status`: non-interactive local session check (agent-safe).
- `tgchats whoami`: shows logged-in account identity and account label; credential and session paths are intentionally omitted.
- `tgchats logout`: logs out current Telegram session.

Reading and navigation:

- `tgchats inbox [--limit N] [--all]`: lists chats with last-message preview.
- `tgchats chat <peer> [--limit N] [--since messageId]`: prints recent chat history.
- `tgchats open <peer>`: shows peer metadata plus local CRM metadata (tags/company/tasks/summary).
- `tgchats search "<query>" [--chat <peer>] [--tag <tag>] [--company <name>] [--limit N] [--local]`:
  Telegram search by default; local Postgres search when `--local` or metadata filters are used.

Inbox and chat reads do not persist Telegram data. Use the explicit `sync`
commands when you want to populate or refresh the local Postgres database.

Telegram state operations:

- `tgchats folders <list|create|rename|delete|order|add|remove> ...`: manages Telegram chat folders.
- `tgchats archive <peer...>`: archives chats on Telegram.
- `tgchats unarchive <peer...>`: unarchives chats on Telegram.

CRM metadata (Postgres-backed):

- `tgchats tags <set|clear|ls> ...`
- `tgchats tags suggest <peer> [--limit N] [--apply]`
- `tgchats company <link|unlink|show|suggest> ...`
- `tgchats tasks <add|done|today|suggest> ...`

AI helpers:

- `tgchats summary <show|refresh> ...`: generated by configured AI mode (supports `show --kind rolling|since_last_seen`).
- `tgchats nudge <peer> [--style concise|friendly]`: generated by configured AI mode.
- `tgchats rules <list|add|disable|delete|run|log> ...`: AI evaluates matches and can dynamically return actions (tag/follow-up timing/priority/why), then actions are persisted with audit logs.
- `tgchats rules add --name ... --instruction ... [--tag ...] [--followup-days ...]`

Sync, backup, and DB:

- `tgchats sync <backfill|once|tail> ...`: persists dialogs/messages into Postgres.
- `tgchats export --format <json|jsonl|csv|md> --out <path>`: exports Postgres-backed data.
- `tgchats import --from <path>`: imports JSON/JSONL exports into Postgres.
- `tgchats db migrate`: applies DB migrations.

Notes:

- AI features require either `AI_MODE=gemini` + `GEMINI_API_KEY` or `AI_MODE=openclaw` + `OPENCLAW_BASE_URL`.
- `DATABASE_URL` is required for CRM metadata, sync persistence, rules, export/import, and local filtered search.
- For agent integrations, prefer `--json` responses and follow [`docs/COMMAND_CONTRACTS.md`](./docs/COMMAND_CONTRACTS.md).
- If JSON mode returns `code: "DATABASE_MIGRATIONS_MISSING"`, run `tgchats db migrate`.
- If JSON mode returns `code: "TELEGRAM_SESSION_STORAGE_OPEN_FAILED"`, check `TELEGRAM_SESSION_PATH` and local filesystem permissions.
- If JSON mode returns `code: "TELEGRAM_SESSION_STORAGE_NATIVE_LOAD_FAILED"`, reinstall dependencies or rebuild `better-sqlite3` for the current machine.

## Telegram Flows

Self-hosted examples live here:

- [Telegram Flows](./skills/tgchats-local/references/telegram-flows.md)
- [tgjson.sh](./skills/tgchats-local/scripts/tgjson.sh) for stable JSON-wrapped CLI calls

## Telegram Skills

Installable workflow skills live under [`skills/`](./skills/).

The hosted package bundles the OAuth-specific `chiho-telegram` skill. The local package bundles the self-hosted `tgchats-local` skill. The broader workflow catalog remains under [`skills/`](./skills/) for individual publication and testing.

Install one published workflow skill with the `skills` CLI:

```bash
npx skills add https://chiho.ai/telegram-skills/telegram-add-colleagues-to-group
```

For docs-only agents or manual inspection, fetch the skill instructions directly:

```bash
curl -fsSL https://chiho.ai/telegram-skills/telegram-add-colleagues-to-group/SKILL.md
```

- Catalog guide: [docs/SKILL_CATALOG.md](./docs/SKILL_CATALOG.md)
- Machine-readable catalog: [skills/catalog.json](./skills/catalog.json)
- Productization notes: [docs/SKILL_PRODUCTIZATION.md](./docs/SKILL_PRODUCTIZATION.md)

## VPS Deployment

Recommended production shape:

- 1 Postgres service/resource
- 1 worker app running `sync tail`
- 1 persistent volume for mtcute session storage

`DATABASE_URL` sourcing modes:

- User-managed DB: provide your own Postgres and set `DATABASE_URL`.
- Platform-provisioned DB: if your OpenClaw/VPS stack provisions Postgres, use that URL as `DATABASE_URL`.

1. Create a Postgres instance/service and set its connection URL in `DATABASE_URL`.
2. Deploy this repo as a long-running worker app on your VPS platform (for example systemd, Docker Compose, Nomad, Kubernetes, or a PaaS on VPS).
3. Set environment variables:

```bash
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
DATABASE_URL=postgres://...
TELEGRAM_ACCOUNT_LABEL=default
TELEGRAM_SESSION_PATH=/app/data/telegram.session
TELEGRAM_PROXY_URL=... # optional
```

4. Add persistent storage mount to `/app/data`.
5. Set post-deploy migration command:

```bash
node dist/cli.js db migrate
```

6. For first-time auth/bootstrap, start the app in an idle mode (for example `sleep infinity`), open a shell in the running container/VM, and run:

```bash
node dist/cli.js auth
node dist/cli.js whoami
node dist/cli.js db migrate
node dist/cli.js sync backfill --dialogs 200 --per-chat-limit 200
```

7. Set the normal worker start command:

```bash
node dist/cli.js sync tail --interval-seconds 60 --dialogs 500
```

Important:

- You should use persistent storage for mtcute session data on a VPS.
- If the session file is not persisted, every redeploy/restart can force re-auth and may break long-running sync reliability.
- Run only one writer process per Telegram account/session (one `sync tail` worker).
- Backup strategy:
  - App data: Postgres backups/snapshots.
  - Portable export: `tgchats export ...` and restore with `tgchats import ...`.
