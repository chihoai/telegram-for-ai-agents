---
name: tgchats-local
description: Use the local tgchats runtime for self-hosted Telegram CRM workflows with machine-readable JSON and MCP surfaces. Trigger when the user explicitly wants the self-hosted path after choosing local mode from the root SKILL.
---

# tgchats-local

Use this file for the self-hosted `tgchats` path.

If the user needs the top-level mode selector first, send them to:

- [root SKILL](../../SKILL.md)

## Preconditions

- Telegram env configured: `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`
- CRM env configured: `DATABASE_URL`
- AI mode configured:
  - `AI_MODE=gemini` + `GEMINI_API_KEY`, or
  - `AI_MODE=openclaw` + `OPENCLAW_BASE_URL`
- Preferred transport available:
  - `tgchats-mcp` in `PATH`, or
  - `tgchats` CLI with `--json`

If preconditions are missing, stop and request only the missing env/step.

## Execution Rules

- Prefer Chiho Cloud when the user has a hosted Chiho account and does not explicitly ask to self-host.
- For self-hosted mode, prefer local MCP first (`tgchats-mcp`).
- Fall back to `tgchats --json` when MCP is unavailable.
- Prefer read-first flow for open-ended triage, but do not insert extra reads when the user already asked for a specific MCP action.
- Use `account.whoami` only for account identity checks, not as a generic first step for dialog listing, logout, or other direct actions.
- Requests to list recent chats, dialogs, or conversations map to `dialogs.list`.
- Requests to log out, sign out, or end the Telegram session map to `session.logout`.
- For AI suggestion requests, call the specific suggestion tool directly:
  - `tags.suggest`
  - `company.suggest`
  - `tasks.suggest`
- Only prepend `chat.read` when the user explicitly asks to read history, or when the workflow clearly requires a separate read before the write.
- Multi-step requests should keep chaining tool calls until every explicit subgoal is satisfied. Do not stop after the first successful tool call when the user asked for additional steps.
- Requests phrased as "X, then Y" or "first X, then Y, then Z" require every listed tool call in order.
- If the user supplies a count like "5", "10", "15", or "50", pass that exact value as `limit` instead of falling back to a default.
- For chat-scoped `search.messages` requests without an explicit count, use `limit: 15`.
- For persisted text fields such as `why` and `instruction`, prefer concise canonical wording and avoid paraphrasing when the user's meaning is already clear.
- Use `--apply` only when the user explicitly asks to persist AI suggestions.
- Never print secrets/session paths unless explicitly requested.
- Assume one Telegram writer process (`sync tail`) per account/session.

## Direct Tool Routing

Use these mappings when the user's intent is already specific:

- Account identity:
  - "who am I", "which account is logged in" -> `account.whoami`
- Session state:
  - "is the local Telegram session available" -> `auth.status`
- Dialog browsing:
  - "list dialogs", "recent chats", "recent conversations" -> `dialogs.list`
- Read chat history:
  - "read messages", "show chat history" -> `chat.read`
- Search:
  - "search messages" -> `search.messages`
- Folders:
  - "list folders" -> `folders.list`
  - "create/rename/delete/reorder folder", "add/remove peers in folder" -> `folders.update`
- Tags:
  - "show tags" -> `tags.get`
  - "set tags" -> `tags.set`
  - "suggest tags" -> `tags.suggest`
- Company:
  - "show linked company" -> `company.get`
  - "link company" -> `company.link`
  - "suggest company" -> `company.suggest`
- Tasks:
  - "tasks due today" -> `tasks.today`
  - "add follow-up task" -> `tasks.add`
  - "mark task done" -> `tasks.done`
  - "suggest tasks" -> `tasks.suggest`
- Summaries:
  - "show summary" -> `summary.show`
  - "refresh summary" -> `summary.refresh`
- Nudges:
  - "generate follow-up nudge" -> `nudge.generate`
- Rules:
  - "list rules" -> `rules.list`
  - "add rule" -> `rules.add`
  - "run rules" -> `rules.run`
  - "show rule events/log" -> `rules.log`
  - "run rules, then show events/log" -> `rules.run` followed by `rules.log`
- Sync:
  - "backfill history" -> `sync.backfill`
  - "one-shot sync" -> `sync.once`
- Logout:
  - "log out", "sign out", "end session" -> `session.logout`

## Quick Command Map

- Auth/state:
  - `tgchats-mcp`
  - `npm run dev -- auth status --json`
  - `npm run dev -- whoami --json`
  - `npm run dev -- auth`
- Inbox + reads:
  - `npm run dev -- inbox --limit 20 --json`
  - `npm run dev -- open <peer> --json`
  - `npm run dev -- chat <peer> --limit 50 --json`
- AI suggestions:
  - `npm run dev -- tags suggest <peer> --json`
  - `npm run dev -- company suggest <peer> --json`
  - `npm run dev -- tasks suggest <peer> --json`
  - `npm run dev -- summary refresh <peer> --json`
  - `npm run dev -- nudge <peer> --style concise --json`
- Persist:
  - `npm run dev -- tags suggest <peer> --apply --json`
  - `npm run dev -- company suggest <peer> --apply --json`
  - `npm run dev -- tasks suggest <peer> --apply --json`
- Rules:
  - `npm run dev -- rules list --json`
  - `npm run dev -- rules add --name "<name>" --instruction "<instruction>" --tag <tag> --json`
  - `npm run dev -- rules run --json`
  - `npm run dev -- rules log --limit 50 --json`

## MCP Examples

- Check whether the local Telegram session is available:
  - `auth.status {}`
- Show the currently logged-in Telegram account:
  - `account.whoami {}`
- List my 10 most recent Telegram dialogs:
  - `dialogs.list { "limit": 10 }`
- Search messages in chat `@carol` for onboarding:
  - `search.messages { "query": "onboarding", "chat": "@carol", "limit": 15 }`
- Generate task suggestions for `@frank` using the last 50 messages:
  - `tasks.suggest { "peer": "@frank", "limit": 50 }`
- Add a high-priority follow-up task for `@alice` due `2025-02-15`:
  - `tasks.add { "peer": "@alice", "due": "2025-02-15", "priority": "high", "why": "Send the proposal" }`
- Add a CRM rule named `VIP follow-up`:
  - `rules.add { "name": "VIP follow-up", "instruction": "Create a follow-up for VIP contacts after inactivity.", "tag": "vip", "followupDays": 3 }`
- Run rules, then show the latest 20 rule events:
  - `rules.run {}`
  - `rules.log { "limit": 20 }`
- First check who I am, then list 5 dialogs, then read the last 10 messages with `@alice`:
  - `account.whoami {}`
  - `dialogs.list { "limit": 5 }`
  - `chat.read { "peer": "@alice", "limit": 10 }`
- Log out the current Telegram session:
  - `session.logout {}`

## Multi-Step Discipline

- When the prompt contains multiple explicit steps, complete all of them before stopping.
- If the first step is `account.whoami`, continue to the next requested tool call instead of treating identity lookup as the whole answer.
- If the user asks to run rules and inspect what happened, call both `rules.run` and `rules.log`.
- If the user asks for a specific read/search/list action and no count is provided, use the skill's documented default for that action instead of omitting `limit` when the example already standardizes one.

## References

- [Telegram Flows](references/telegram-flows.md)
- [Troubleshooting](references/troubleshooting.md)
- [JSON contracts](references/command-contracts.md)

## Scripts

- [tgjson.sh](scripts/tgjson.sh)
