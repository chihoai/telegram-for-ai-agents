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
- Prefer read-first flow: `whoami` -> `inbox` -> `open/chat` before writes.
- Use `--apply` only when the user explicitly asks to persist AI suggestions.
- Never print secrets/session paths unless explicitly requested.
- Assume one Telegram writer process (`sync tail`) per account/session.

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

## References

- [Telegram Flows](references/telegram-flows.md)
- [Troubleshooting](references/troubleshooting.md)
- [JSON contracts](references/command-contracts.md)

## Scripts

- [tgjson.sh](scripts/tgjson.sh)
