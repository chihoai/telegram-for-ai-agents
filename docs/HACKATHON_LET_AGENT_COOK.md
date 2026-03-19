# Let the Agent Cook Demo

This repo now includes a local-first Flows runtime for the Synthesis / PL_Genesis `Let the Agent Cook` track.

## Required Env

Telegram + CRM:

```bash
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tgchats
```

AI:

```bash
AI_MODE=gemini
GEMINI_API_KEY=...
```

or

```bash
AI_MODE=openclaw
OPENCLAW_BASE_URL=http://localhost:3000
```

ERC-8004 registration:

```bash
EVM_RPC_URL=...
AGENT_OPERATOR_PRIVATE_KEY=...
ERC8004_IDENTITY_REGISTRY_ADDRESS=...
```

## Setup

```bash
npm install
docker compose up -d
npm run dev -- db migrate
npm run dev -- auth
npm run dev -- sync backfill --dialogs 200 --per-chat-limit 100
```

## Flow Catalog

```bash
npm run dev -- flows list
npm run dev -- flows show bd.followup
```

Built-in flows:

- `bd.followup`
- `marketing.event_followup`
- `investor.pipeline_followup`
- `support.first_response`
- `network.intro_router`

## Run A Real Flow

Dry run:

```bash
npm run dev -- flows run bd.followup --dry-run
```

Live run with guarded send enabled:

```bash
npm run dev -- flows run bd.followup
```

Inspect the latest runs:

```bash
npm run dev -- flows status
npm run dev -- flows dashboard
```

## Generate `agent.json`

```bash
npm run dev -- flows export-agent --out ./artifacts/agent.json
```

## Register ERC-8004 Identity

```bash
npm run dev -- identity register
npm run dev -- identity show
```

`identity register` stores the result locally, updates the generated `agent.json`, and returns the transaction hash plus agent id.

## Generate `agent_log.json`

After a successful run:

```bash
npm run dev -- flows status --latest-success
npm run dev -- flows export-log <runId> --out ./artifacts/agent_log.json
```

## Judge Shortcut

```bash
npm run hackathon:artifacts
```

This exports the tool contracts, writes `./artifacts/agent.json`, and prints the latest successful run id for `agent_log.json`.

## Safety Model

- Sends are allowed only in existing active threads.
- The runtime blocks duplicate follow-ups within the dedupe window.
- The runtime blocks sends when the latest chat state changed after planning.
- Guardrail failures fall back to task or handoff outputs instead of silent success.
- Team handoff output is local metadata only; real team execution remains a later Chiho Cloud path.
