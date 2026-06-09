# Self-Hosted Skill Testing Runbook

Use this runbook in a fresh Codex thread to test the self-hosted `tgchats` setup and the Telegram workflow skills.

## Context

- Repo: `telegram-for-agents`
- Runtime: local/self-hosted `tgchats` CLI plus local MCP server (`tgchats-mcp`)
- Public entry skill: `SKILL.md`
- Local runtime skill: `skills/tgchats-local/SKILL.md`
- Command contracts: `docs/COMMAND_CONTRACTS.md`
- MCP tool contracts: `docs/tool-contracts.json`

Do not print Telegram API hashes, session files, session strings, database URLs with passwords, or AI API keys.

## Preconditions

Required:

- Node.js 22 or 23
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`

Recommended:

- `DATABASE_URL`, for CRM metadata, sync, rules, export/import, and local search
- `TELEGRAM_ACCOUNT_LABEL=default`
- `TELEGRAM_SESSION_PATH`, pointing at a persistent session file

AI mode, choose one:

- `AI_MODE=gemini` plus `GEMINI_API_KEY`
- `AI_MODE=openclaw` plus `OPENCLAW_BASE_URL`

Optional:

- `TELEGRAM_PROXY_URL`
- `AI_TIMEOUT_MS`

## Setup Checks

Run:

```bash
npm install
npm test
npm run build
npm run export:contracts
npm run check:local-install
```

If `better-sqlite3` has a native module mismatch:

```bash
npm rebuild better-sqlite3 --build-from-source
```

If using local Postgres:

```bash
docker compose up -d
npm run dev -- db migrate
```

Expected:

- Tests pass.
- Build passes.
- `docs/tool-contracts.json` is current.
- Local install check passes, or reports only missing runtime credentials/session.

## Auth And Session

Check non-interactive status:

```bash
npm run dev -- auth status --json
```

If not logged in:

```bash
npm run dev -- auth
```

Rules:

- If a QR code appears, show the full QR code block and expiry to the user.
- Keep the process running until login completes, 2FA is needed, or the user asks to stop.
- Never commit or print session files.

After login:

```bash
npm run dev -- whoami --json
```

Expected:

- `auth status --json` returns `ok: true`.
- `whoami --json` returns account identity and session path.

## Read-Only CLI Smoke

Run:

```bash
npm run dev -- inbox --limit 10 --json
npm run dev -- folders list --json
npm run dev -- tasks today --json
npm run dev -- rules list --json
```

Pick a harmless peer from `inbox`, then run:

```bash
npm run dev -- open <peer> --json
npm run dev -- chat <peer> --limit 10 --json
npm run dev -- search "test" --chat <peer> --limit 15 --json
```

Expected:

- JSON responses have `ok: true`.
- `chat` returns recent messages.
- `open` includes CRM metadata when `DATABASE_URL` is configured; otherwise metadata may be unavailable.

## Local MCP Smoke

Start local MCP:

```bash
npm run mcp
```

After build:

```bash
./dist/mcp/stdio.js
```

If testing through an MCP client, call:

- `auth.status {}`
- `account.whoami {}`
- `dialogs.list { "limit": 10 }`
- `chat.read { "peer": "<peer>", "limit": 10 }`
- `folders.list {}`
- `tasks.today {}`
- `rules.list {}`

Expected:

- Local MCP tool calls mirror CLI JSON behavior.
- `accountId` is not supported by local tool dispatch yet; use `TELEGRAM_ACCOUNT_LABEL` for account selection.

## Sync And CRM Store

Use small limits first:

```bash
npm run dev -- sync once --dialogs 20 --json
npm run dev -- sync backfill --dialogs 20 --per-chat-limit 50 --json
```

For worker testing:

```bash
npm run dev -- sync tail --interval-seconds 60 --dialogs 100
```

Rules:

- Run only one writer process per Telegram account/session.
- Stop `sync tail` after confirming it starts and processes updates.
- Expect Telegram rate limits for large backfills; increase limits gradually.

After sync:

```bash
npm run dev -- search "test" --local --limit 20 --json
npm run dev -- tags ls --json
npm run dev -- tasks today --json
```

Expected:

- Dialogs/messages are persisted to Postgres.
- Local filtered search works when `DATABASE_URL` is configured.

## AI And CRM Suggestions

Pick a harmless peer and run non-mutating suggestions first:

```bash
npm run dev -- tags suggest <peer> --json
npm run dev -- company suggest <peer> --json
npm run dev -- tasks suggest <peer> --json
npm run dev -- summary refresh <peer> --json
npm run dev -- nudge <peer> --style concise --json
```

Expected:

- AI-backed commands return `ok: true`.
- If AI env is missing, errors should clearly identify missing `GEMINI_API_KEY` or `OPENCLAW_BASE_URL`.

Only after user approval:

```bash
npm run dev -- tags suggest <peer> --apply --json
npm run dev -- company suggest <peer> --apply --json
npm run dev -- tasks suggest <peer> --apply --json
```

## Controlled CRM Mutations

Use a test peer or harmless bot/group.

```bash
npm run dev -- --json tags set <peer> "Codex Smoke Test"
npm run dev -- company link <peer> --company "Codex Smoke Test" --json
npm run dev -- tasks add <peer> --due 2026-06-08 --priority low --why "Codex self-hosted smoke test" --json
npm run dev -- tasks today --json
```

Then clean up smoke metadata and mark the smoke task done:

```bash
npm run dev -- tags clear <peer> --json
npm run dev -- company unlink <peer> --json
npm run dev -- tasks done <taskId> --json
```

Expected:

- CRM metadata persists in Postgres.
- Re-running reads does not create duplicates.
- Tags and company links can be cleaned up.
- Task can be closed cleanly.

## Rules Smoke

Create a harmless CRM-only rule. Keep the smoke rule free of default tag or
follow-up actions so cleanup can remove the rule without leaving rule-created
tags or tasks behind.

```bash
npm run dev -- rules add --name "Codex smoke test - safe to delete" --instruction "Smoke-test rule listing and dry-run only; do not create tags or tasks." --json
npm run dev -- rules list --json
npm run dev -- rules run --dry-run --json
npm run dev -- rules log --limit 20 --json
npm run dev -- rules disable <ruleId> --json
npm run dev -- rules delete <ruleId> --json
```

Expected:

- `rules.list` shows the rule.
- `rules run --dry-run` evaluates without writing.
- `rules.log` remains readable.
- `rules.disable` and `rules.delete` clean up the smoke rule by stable `ruleId`.

## Folder And Telegram State Smoke

Read-only:

```bash
npm run dev -- folders list --json
```

Controlled folder writes:

```bash
npm run dev -- folders create --title "Codex Smoke Test" --json
npm run dev -- folders add "Codex Smoke Test" <peer> --json
npm run dev -- folders remove "Codex Smoke Test" <peer> --json
npm run dev -- folders delete "Codex Smoke Test" --json
```

Archive/unarchive only on a safe peer:

```bash
npm run dev -- archive <peer>
npm run dev -- unarchive <peer>
```

Expected:

- Folder create/add/remove/delete works and can clean up.
- Archive/unarchive returns success and does not affect unintended peers.

## Preview, Send, Invite, And Leave Boundaries

These are high-risk. Do not execute send/invite/leave without explicit user approval and a safe target.

Test order:

1. Preview only.
2. Inspect preview record.
3. Execute only if the user explicitly approves.

Tool families to test when safe:

- `outbox.preview`
- `outbox.sendApproved`
- `message.sendDraft`
- `members.invitePreview`
- `members.inviteApproved`
- `groups.leavePreview`
- `groups.leaveApproved`

Expected:

- Preview creates an inspectable record without sending or changing Telegram state.
- Approved execution is idempotent where an idempotency key is provided.
- Unsafe targets are rejected clearly.

## Export And Import

After a small sync:

```bash
mkdir -p exports
npm run dev -- export --format json --out ./exports/codex-smoke.json
npm run dev -- export --format csv --out ./exports/codex-smoke.csv
npm run dev -- export --format md --out ./exports/codex-smoke.md
```

For import testing, use a temporary database when possible:

```bash
npm run dev -- import --from ./exports/codex-smoke.json
```

Expected:

- Export files are created.
- Exported chat content is treated as sensitive.
- Import succeeds in a disposable DB or clearly reports duplicate/validation behavior.

## Workflow Skill Coverage

Test these with local MCP or CLI fallback:

- `telegram-followup-tasks`
- `telegram-meeting-recap`
- `telegram-lead-qualification`
- `telegram-partner-pipeline`
- `telegram-vip-inbox`
- `telegram-deck-followup`
- `telegram-intro-request-triage`
- `telegram-support-escalation`
- `telegram-hiring-pipeline`
- `telegram-investor-updates`
- `telegram-crm-export`

High-risk workflows require preview/approval discipline:

- `telegram-bulk-template-message`
- `telegram-conditional-replies`
- `telegram-add-colleagues-to-group`
- `telegram-group-cleanup`

For each workflow:

1. Read `skills/<skill-name>/SKILL.md`.
2. Read `references/tgchats-local.md` and `references/safety.md`.
3. Start with read-only tools.
4. Use `--apply` only when the user approves.
5. Use preview/approval for any send, invite, or leave action.
6. Prefer a harmless peer or test group for state-changing tests.

## Failure Cases To Test

Missing env:

- Unset or hide `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` and confirm clear `TELEGRAM_NOT_CONFIGURED` style errors.
- Unset `DATABASE_URL` and confirm CRM/sync/export commands fail clearly while read-only Telegram commands still work.
- Unset AI config and confirm AI commands fail clearly.

Bad session/storage:

- Set `TELEGRAM_SESSION_PATH` to an unwritable path and confirm a clear storage error.
- If native module errors occur, confirm the guidance points to rebuilding `better-sqlite3`.

Invalid inputs:

- Invalid peer for `chat`, `open`, `tags`, and `tasks`.
- Invalid folder name/id.
- Invalid task id for `tasks done`.
- Invalid export path.

Expected:

- JSON mode returns `{ "ok": false, "error": "..." }` and, where available, a useful `code`.
- Non-JSON mode exits non-zero with a readable message.

## Product Gaps To Watch For

- Rule cleanup/disable/delete path may be missing.
- Large backfills may need better Telegram rate-limit backoff.
- Local MCP account selection currently depends on `TELEGRAM_ACCOUNT_LABEL`; `accountId` is not supported by local dispatch.
- Some high-risk write tools may require more explicit preview/run audit documentation.
- Export/import should be tested against a disposable DB to avoid polluting real CRM state.
