# OpenClaw Local Integration Validation Checklist

Use this checklist before publishing/releasing the local OpenClaw skill integration.

## 1) Environment + Bootstrap

- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] `npm test` succeeds
- [ ] Required env vars set (`TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `DATABASE_URL`)
- [ ] AI mode set:
  - [ ] Gemini mode (`AI_MODE=gemini`, `GEMINI_API_KEY`), or
  - [ ] OpenClaw mode (`AI_MODE=openclaw`, `OPENCLAW_BASE_URL`)
- [ ] `npm run dev -- db migrate` succeeds
- [ ] `npm run dev -- auth` succeeds

## 2) JSON Contracts

- [ ] `npm run dev -- whoami --json` returns valid JSON
- [ ] `npm run dev -- inbox --limit 5 --json` returns valid JSON
- [ ] `npm run dev -- chat <peer> --limit 20 --json` returns valid JSON
- [ ] `npm run dev -- open <peer> --json` returns valid JSON
- [ ] `npm run dev -- tags ls --json` returns valid JSON
- [ ] `npm run dev -- tasks today --json` returns valid JSON
- [ ] `npm run dev -- summary show <peer> --json` returns valid JSON
- [ ] `npm run dev -- rules list --json` returns valid JSON
- [ ] `npm run dev -- rules run --json` returns valid JSON
- [ ] `npm run dev -- rules log --json` returns valid JSON

## 3) AI Workflow

- [ ] `tags suggest <peer> --json` works
- [ ] `company suggest <peer> --json` works
- [ ] `tasks suggest <peer> --json` works
- [ ] `summary refresh <peer> --json` writes rolling + since_last_seen
- [ ] `nudge <peer> --json` works
- [ ] `rules run --json` produces dynamic AI actions with audit log entries

## 4) Persistence + Sync

- [ ] `sync backfill` writes peers/dialogs/messages
- [ ] `sync tail` runs continuously
- [ ] Session path is on persistent storage
- [ ] Exactly one `sync tail` per account/session

## 5) Skill Packaging

- [ ] `skills/tgchats-local/SKILL.md` has valid frontmatter
- [ ] References exist and are linked from SKILL.md
- [ ] Command contracts doc exists and matches runtime behavior
- [ ] Troubleshooting covers env/auth/db/AI/proxy cases
