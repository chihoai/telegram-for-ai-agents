# Roadmap: Telegram CRM CLI

This doc turns the Marketing/BD user flows into a concrete CLI plan, a storage model, and a sync-worker architecture.

## Principles

- Keep `mtcute` session storage separate from app/CRM data.
- Make syncing idempotent and resumable (cursors + dedupe).
- Prefer read-only by default; anything that sends messages or mutates Telegram state should be explicit and auditable.
- Use the same app DB locally and on VPS (Postgres via `DATABASE_URL`).

## Implementation Status

Implemented now:

- `auth`, `whoami`, `logout`
- `inbox`, `chat`, `open`, `search`
- `folders list/create/rename/delete/order/add/remove`
- `archive`, `unarchive`
- `tags set/ls/suggest`, `company link/show/suggest`, `tasks add/done/today/suggest`
- `summary show/refresh` (AI-backed)
- `nudge` (AI-backed)
- `rules list/add/run/log`
- `sync backfill/once/tail` (polling-based)
- `export` and `import`
- `db migrate`
- AI mode switch: `AI_MODE=gemini|openclaw`
- Agent-ready `--json` surfaces for core read/automation flows
- Local OpenClaw skill package: `skills/tgchats-local/`
- Command contracts + validation checklist:
  - `docs/COMMAND_CONTRACTS.md`
  - `docs/OPENCLAW_VALIDATION_CHECKLIST.md`

Implemented architecture:

- CLI routing: `src/cli.ts`
- Command handlers: `src/commands/*`
- Telegram wrappers: `src/services/*`
- App context/config: `src/app/*`
- Postgres schema + migrations: `src/db/schema.ts`, `src/db/migrate.ts`

Remaining advanced work:

- Replace polling tail loop with update-driven ingest + reconciliation.
- Add richer compliance exports/import validation and retention controls.
- Add stronger full-text indexing/tuning and test coverage for command flows.

## Current Code Structure (the “in-between” layer)

CLI -> Commands -> Services -> mtcute + DB.

- `src/cli.ts`:
  - routes `tgchats inbox` and `tgchats db ...`
  - defaults to `inbox` if no explicit command is provided
- `src/commands/*`:
  - command handlers, printing output and mapping flags -> service calls
- `src/services/*`:
  - “thin wrappers” around mtcute high-level APIs
- `src/app/*`:
  - config/env parsing, context creation, Telegram client creation
- `src/db/*`:
  - Postgres pool, migrations, and write helpers

This structure keeps mtcute calls out of the CLI entrypoint and makes it easy to grow features without turning `src/cli.ts` into a monolith.

## Local DB Setup (matches VPS)

We use Postgres for app/CRM data.

- Start local Postgres:
  - `docker compose up -d`
- Set env:
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/tgchats`
- Run migrations:
  - `tgchats db migrate`

The mtcute session storage remains separate and is configured by `TELEGRAM_SESSION_PATH`.

## CLI Surface (proposed)

Binary stays `tgchats` for now; add subcommands (via a CLI framework later).

### Auth / session

- `tgchats auth`
  - Ensures session is authorized (QR then phone fallback).
  - Flags: `--session <path>` override `TELEGRAM_SESSION_PATH`
- `tgchats whoami`
  - Prints current user, DC, and session path.
- `tgchats logout [--revoke]`
  - Logs out locally; optionally revokes the Telegram session.

### Inbox / reading

- `tgchats inbox [--limit N] [--all] [--archived keep|exclude|only] [--pinned include|exclude|only|keep]`
  - Lists dialogs with last message preview (current behavior generalized).
- `tgchats chat <peer> [--limit N] [--since <date|msgid>]`
  - Shows recent messages for one peer.
  - `peer` accepts username, numeric id, or marked id if supported.
- `tgchats open <peer>`
  - Prints metadata: title, participants (if group), tags, tasks, last synced info.

### Search

- `tgchats search "<query>" [--chat <peer>] [--folder <name>] [--tag <tag>] [--company <name>] [--from <date>] [--to <date>]`
  - Starts with Telegram-side search; later uses local index for speed and richer filters.

### Telegram folders (native dialog filters)

- `tgchats folders list`
- `tgchats folders create --title "Leads" [--include <peer...>] [--exclude <peer...>]`
- `tgchats folders rename <id|title> --title "Customers"`
- `tgchats folders delete <id|title>`
- `tgchats folders order <id...>`
- `tgchats folders add <id|title> <peer...>`
- `tgchats folders remove <id|title> <peer...>`

### CRM layers (internal)

These features should not depend on Telegram folders alone.

- `tgchats tags set <peer> <tag...> [--source manual|ai|rule]`
- `tgchats tags ls [--peer <peer>]`
- `tgchats company link <peer> --company "Acme" [--role "BD"]`
- `tgchats tasks add <peer> --due 2026-02-24 --why "Pricing follow-up" [--priority high]`
- `tgchats tasks done <task_id>`
- `tgchats tasks today`
- `tgchats summary show <peer>`
- `tgchats summary refresh <peer|--all>`

### Automations (rules engine)

- `tgchats rules list`
- `tgchats rules add ...` (YAML/JSON rule definition)
- `tgchats rules run [--dry-run] [--since <timestamp>]`
- `tgchats rules log [--limit N]`

### Backup / export

- `tgchats export --format jsonl|json|md|csv --out <dir> [--all|--folder <id|title>|--chat <peer>]`
- `tgchats import --from <dir>` (app/CRM metadata first; messages optional)

## Processes (how it runs)

### Local mode (interactive CLI)

- CLI does read-only `mtcute` operations.
- CLI can also query local app DB for tags/tasks/summaries and merge into output.

### Sync worker mode (recommended for “CRM inbox”)

Run as a separate process:

- `tgchats sync backfill [--all] [--limit-dialogs N] [--per-chat-limit N]`
- `tgchats sync tail` (long-running updates listener)
- `tgchats sync once` (single incremental run)

The worker is the only writer to the app DB and the only process that should hold a Telegram session open on a VPS.

## Storage Architecture

### 1) mtcute session storage (existing)

- SQLite file at `TELEGRAM_SESSION_PATH`
- Used by mtcute for auth keys, peers cache, update state, etc.
- Not a product DB. Do not add your own tables.

### 2) App/CRM DB (new)

Postgres only (same setup locally and on VPS via `DATABASE_URL`).

The app DB stores:
- normalized peers
- normalized dialogs + cursors
- normalized messages (optional at first; can start with metadata only)
- tags, companies, tasks, summaries, automations, audit logs

## App DB Schema (minimal v1)

This is a pragmatic starting point; refine as features land.

Tables:

- `accounts`
  - `id` (pk)
  - `label` (text) e.g. "personal"
  - `session_path` (text)
  - `created_at`

- `peers`
  - `account_id` (fk)
  - `peer_id` (bigint)
  - `peer_type` (text) user|chat|channel
  - `username` (text, nullable)
  - `display_name` (text)
  - `updated_at`
  - pk (`account_id`, `peer_id`)

- `dialogs`
  - `account_id` (fk)
  - `peer_id` (fk to peers)
  - `archived` (bool)
  - `pinned` (bool)
  - `last_message_id` (int, nullable)
  - `last_message_at` (timestamp, nullable)
  - `unread_count` (int)
  - `updated_at`
  - pk (`account_id`, `peer_id`)

- `messages` (optional in v1, but needed for CRM inbox)
  - `account_id`
  - `peer_id`
  - `message_id`
  - `sent_at`
  - `sender_peer_id`
  - `text` (text)
  - `is_service` (bool)
  - `media_type` (text, nullable)
  - pk (`account_id`, `peer_id`, `message_id`)
  - index (`account_id`, `peer_id`, `sent_at`)

- `tags`
  - `account_id`
  - `tag` (text)
  - pk (`account_id`, `tag`)

- `peer_tags`
  - `account_id`
  - `peer_id`
  - `tag`
  - `source` manual|ai|rule
  - `confidence` (real, nullable)
  - `created_at`
  - pk (`account_id`, `peer_id`, `tag`)

- `companies`
  - `account_id`
  - `company_id` (pk)
  - `name` (text)
  - `created_at`

- `peer_company`
  - `account_id`
  - `peer_id`
  - `company_id`
  - `role` (text, nullable)
  - `source` manual|ai|rule
  - pk (`account_id`, `peer_id`)

- `tasks`
  - `account_id`
  - `task_id` (pk)
  - `peer_id`
  - `due_at`
  - `status` open|done|snoozed
  - `why` (text)
  - `priority` low|med|high
  - `created_at`
  - `updated_at`

- `summaries`
  - `account_id`
  - `peer_id`
  - `kind` rolling|since_last_seen
  - `content` (text)
  - `source_model` (text, nullable)
  - `updated_at`
  - pk (`account_id`, `peer_id`, `kind`)

- `sync_cursors`
  - `account_id`
  - `peer_id`
  - `last_synced_message_id` (int, nullable)
  - `last_synced_at` (timestamp, nullable)
  - `last_run_at` (timestamp, nullable)
  - `error` (text, nullable)
  - pk (`account_id`, `peer_id`)

- `rule_runs` / `rule_events` (audit trail)

## Sync Algorithm (concrete)

### Backfill

1. Iterate dialogs:
   - `iterDialogs({ archived: 'keep', pinned: 'include' })`
2. Upsert peer + dialog metadata into app DB.
3. For each dialog:
   - Determine start cursor:
     - if `sync_cursors.last_synced_message_id` exists, skip backfill or continue from there
     - else backfill recent N messages first (configurable), then optionally expand
   - `iterHistory(peer, { limit: pageSize, offsetId, offsetDate })`
   - Insert messages (dedupe on `(account_id, peer_id, message_id)`).
4. Update cursor high-water marks after each page.

### Incremental tail

Two options:

1) Updates-driven (preferred)
- Subscribe to new message/update events, insert into app DB as they arrive.
- For safety, periodically reconcile `iterDialogs` and patch gaps.

2) Poll-driven (fallback)
- Every N seconds, `iterDialogs({ limit: M })` and for each dialog with `lastMessageId > cursor`, fetch missing via `iterHistory`.

## Milestones (build order)

1. CLI subcommands + consistent config
   - Status: done
2. App DB introduced (Postgres) + migrations
   - Status: done
3. Poll-based sync worker (`backfill/once/tail`)
   - Status: done (polling MVP)
4. Tags + tasks + daily queue + company links
   - Status: done
5. Search + exports/imports + rules audit
   - Status: done (MVP)
6. AI enrichment + update-driven ingest + production hardening
   - Status: next
