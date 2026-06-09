# Chiho Cloud Skill Testing Runbook

Use this runbook in a fresh Codex thread to continue testing Chiho.ai Cloud MCP and the Telegram workflow skills.

## Context

- Repo: `telegram-for-agents`
- Cloud MCP URL: `https://api.chiho.ai/mcp`
- Expected env vars in `.env`:
  - `CHIHO_API_KEY`
  - `CHIHO_MCP_URL=https://api.chiho.ai/mcp`
- Do not print API keys or Telegram session data.
- Prefer non-mutating checks first. For CRM mutations, use a harmless bot/test peer.
- Do not send Telegram messages unless the user explicitly approves a preview/send workflow.

## Current Live Baseline

Already verified on 2026-06-08:

- DNS/TLS for `api.chiho.ai` works.
- Cloud MCP initializes as `chiho-cloud`, protocol `2025-11-25`.
- `tools/list` exposes 23 tools after `sync.once` shipped.
- `sync.once` is advertised with `dialogs.maximum: 1000`.
- `sync.once { dialogs: 20 }` synced 20/20 recent dialogs into CRM metadata.
- CRM metadata coverage improved from 5/20 to 20/20 after sync.
- `chat.read` may return a minimum page size of 10 even when a smaller limit is requested.
- Invalid CRM peers return `Chat metadata is not available yet for that peer in Chiho.`
- Invalid Telegram read peers return `TELEGRAM_PEER_RESOLUTION_FAILED`.

Additional testing on 2026-06-08:

- `tools/list` still exposes 23 tools.
- `auth.status` succeeds with `telegram.read` and `crm.write` scopes.
- `dialogs.list { limit: 20 }` returns 20 dialogs.
- `folders.list` succeeds and returns 8 folders.
- `rules.list` succeeds and returns 0 rules.
- `tasks.today` succeeds and returns 0 tasks.
- Local repo validation passed: `npm test`, `npm run validate:skills`, and `npm run build`.
- `npm run check:local-install` passed; local MCP startup and exported contracts report 38 local tools.
- `account.whoami` succeeds and returns account/scope metadata.
- `chat.read { peer: "777000", limit: 1 }` succeeds but returns 10 messages, confirming the minimum page-size behavior.
- `folders.create`, `folders.addDialog`, and `folders.removeDialog` return `Tool is not available for this token.`
- `search.messages`, `nudge.generate`, `outbox.preview`, `message.sendDraft`, `members.invitePreview`, and `groups.leavePreview` return `Tool is not available for this token.`
- CRM/rule cleanup boundary found: `tags.set { tags: [] }` is rejected, and `tags.clear`, `company.unlink`, `rules.delete`, and `rules.disable` are unavailable for the current token.
- Stopped before positive `tags.set`, `company.link`, or `rules.add` tests to avoid leaving durable smoke-test metadata with no cleanup path.

Open issue:

- `sync.once { dialogs: 100 }` can hit Telegram `FLOOD_WAIT`; see `chihoai/chiho#57`.

Implementation follow-up on 2026-06-09:

- Local PR: `chihoai/telegram-for-ai-agents#18`, branch `codex/crm-cleanup-tools`, latest checked head `82fba96`.
- Cloud PR: `chihoai/chiho#59`, branch `codex/validate-sync-once-dialogs`, latest checked head `0cb4bfc`.
- Local `tgchats`/`tgchats-mcp` cleanup parity was implemented for `tags.clear`, `company.unlink`, `rules.disable`, and `rules.delete`.
- Local `tags.set { tags: [] }` now dispatches to tag cleanup.
- Local rule cleanup accepts canonical string IDs from Postgres `bigserial` results, while rejecting malformed, decimal, partial, leading-zero, boolean, and unsafe integer inputs.
- Local `tags set <peer> <tag...> --json` no longer persists `--json` as a tag.
- Hosted Chiho.ai Cloud backend support was implemented in `/Users/chris/Documents/Workspace/chiho/monorepo-cloud-mcp-pr` for `tags.clear`, `company.unlink`, `rules.disable`, `rules.delete`, and `tags.set { tags: [] }`.
- Hosted Cloud `sync.once` dialog-count validation was implemented so schema-invalid `dialogs` values are rejected instead of clamped.
- Hosted Cloud contracts were updated so cleanup `ruleId` accepts integer or canonical digit string IDs.
- Hosted Cloud smoke tooling now separates reversible write checks from tag/company metadata writes: use `--mutate` for reversible task/rule checks and add `--crm-metadata` only for safe test peers.
- Hosted Cloud smoke tooling now fails fast when an explicit `--peer` is not found instead of mutating a fallback dialog.
- Hosted Cloud peer-scoped CRM tools now advertise and honor `accountId` for personal multi-account routing.
- Hosted Cloud team token paths now reject forbidden `accountId` on peer CRM tools and `summary.refresh { all: true }` instead of silently mutating/reading outside the requested account boundary.
- Hosted Cloud `summary.refresh` now routes personal single-peer and bulk refreshes through the selected account, but deliberately avoids passing account IDs into team summary generation to prevent team dialog ID repair/corruption.
- Verification passed before handoff:
  - Local: `npm test`, `npm run build`, `npm run validate:skills`, `npm run check:local-install`, `git diff --check`; local install check reported 42 local MCP tools.
  - Cloud: `npm test --workspace @chiho/backend`, targeted MCP tests, `npm run typecheck --workspace @chiho/backend`, `npm run sync:agent-contracts:check --workspace @chiho/backend`, `node --check backend/scripts/smoke-agent-mcp.mjs`, `git diff --check`.
- Final subagent review passes reported no active P0/P1/P2 findings on both PR heads.
- Hosted Chiho.ai Cloud still needs merge/deployment and live retest before treating these as production behavior.

## Quick MCP Smoke Script

Run from this repo:

```bash
node --input-type=module <<'NODE'
import { config } from 'dotenv';
config();

const key = process.env.CHIHO_API_KEY;
const url = process.env.CHIHO_MCP_URL || 'https://api.chiho.ai/mcp';
if (!key) throw new Error('CHIHO_API_KEY missing');

let id = 1;
async function rpc(method, params = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: id++, method, params }),
  });
  return await res.json();
}

function contentJson(json) {
  const text = json?.result?.content?.find?.((c) => c.type === 'text')?.text;
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { text }; }
}

await rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'codex-skill-test', version: '0.0.0' },
});

const tools = await rpc('tools/list');
const names = tools.result.tools.map((tool) => tool.name);
console.log({ toolCount: names.length, hasSyncOnce: names.includes('sync.once') });

const auth = contentJson(await rpc('tools/call', {
  name: 'auth.status',
  arguments: {},
}));
console.log({
  authenticated: auth?.authenticated,
  accountCount: auth?.accountCount,
  scopes: auth?.token?.capabilityScopes,
});
NODE
```

## Tested Tools

These have been exercised against Chiho.ai Cloud:

- `auth.status`
- `account.whoami`
- `tools/list`
- `dialogs.list`
- `chat.read`
- `sync.once`
- `tags.get`
- `tags.suggest` with `apply:false`
- `company.get`
- `company.suggest` with `apply:false`
- `tasks.today`
- `tasks.add`
- `tasks.done`
- `tasks.suggest` with `apply:false`
- `summary.show`
- `summary.refresh`
- `folders.list`
- `rules.list`

Implemented in PRs but not yet live-retested against `https://api.chiho.ai/mcp`:

- `tags.clear`
- `company.unlink`
- `rules.disable`
- `rules.delete`
- `tags.set { tags: [] }`
- `summary.refresh` personal account routing
- `summary.refresh { all: true, accountId }`
- Team-token rejection for forbidden `accountId`

## Untested Or Lightly Tested Tools

Test these next:

1. Folder reads and writes
   - [x] `folders.list` tested on 2026-06-08
   - [x] `folders.create` unavailable for current token on 2026-06-08
   - [x] `folders.addDialog` unavailable for current token on 2026-06-08
   - [x] `folders.removeDialog` unavailable for current token on 2026-06-08

2. Rules
   - [x] `rules.list` tested on 2026-06-08
   - [ ] `rules.add` live retest after Cloud PR deploy
   - [ ] `rules.disable` live retest after Cloud PR deploy
   - [ ] `rules.delete` live retest after Cloud PR deploy
   - [ ] `rules.run`
   - [ ] `rules.log`

3. CRM mutations beyond tasks
   - [x] `tags.set { tags: [] }` cleanup boundary tested on 2026-06-08; rejected as non-empty array required
   - [ ] `tags.set` positive mutation live retest after Cloud PR deploy
   - [ ] `tags.clear` live retest after Cloud PR deploy
   - [ ] `company.link` positive mutation live retest after Cloud PR deploy
   - [ ] `company.unlink` live retest after Cloud PR deploy
   - [ ] `company.get` after linking not run
   - [ ] `tags.get` after setting not run

4. Account scope and summary routing
   - [ ] Personal multi-account `tags.get`/`tags.set`/`tags.clear` with explicit `accountId`
   - [ ] Personal multi-account `company.get`/`company.link`/`company.unlink` with explicit `accountId`
   - [ ] Personal `summary.refresh { peer, accountId }`
   - [ ] Personal `summary.refresh { all: true, accountId }`
   - [ ] Team token valid `accountId` on a scoped peer
   - [ ] Team token forbidden `accountId` should return `403`

5. Write/approval tools, if token scopes allow
   - [x] `outbox.preview` unavailable for current token on 2026-06-08
   - `outbox.sendApproved`
   - [x] `message.sendDraft` unavailable for current token on 2026-06-08

6. Member/group tools, if token scopes allow
   - [x] `members.invitePreview` unavailable for current token on 2026-06-08
   - `members.inviteApproved`
   - [x] `groups.leavePreview` unavailable for current token on 2026-06-08
   - `groups.leaveApproved`

7. Skill-referenced but possibly unavailable hosted tools
   - [x] `search.messages` unavailable for current token on 2026-06-08
   - [x] `nudge.generate` unavailable for current token on 2026-06-08

## Suggested Next Test Order

### 1. Non-Mutating Inventory

- Run `tools/list`.
- Run `auth.status`.
- Run `dialogs.list { limit: 20 }`.
- Run `folders.list`.
- Run `rules.list`.
- Run `tasks.today`.

Expected:

- No errors.
- Tool availability matches token scopes.
- If a tool is unavailable, capture whether it is missing from `tools/list` or rejected by token scope.

### 2. Controlled CRM Mutations

Use a harmless peer such as a server notification bot or test group.

Test:

- `tags.set` with a clearly temporary tag, such as `Codex Smoke Test`.
- `tags.get` to confirm the tag.
- `tags.clear` to clean up the temporary tag.
- `company.link` with a test company value, such as `Codex Smoke Test`.
- `company.get` to confirm the link.
- `company.unlink` to clean up the temporary company.
- Optionally restore prior state if needed.

Avoid human contacts unless the user explicitly chooses one.

Do not run tag/company mutation smoke on a real business contact unless the prior state has been captured and the user accepts timestamp churn. The Cloud smoke runner intentionally requires `--crm-metadata` for these writes.

### 3. Rules Smoke

Create a rule that only touches CRM metadata and is clearly a test.

Suggested behavior:

- `rules.add` with a name like `Codex smoke test - safe to delete`.
- Rule instruction should be narrow and harmless.
- `rules.list` should show it.
- `rules.run` should execute without sending messages.
- `rules.log` should show the run.
- `rules.disable` should disable the smoke rule.
- `rules.delete` should delete the smoke rule.

If any cleanup step is missing after deployment, record it as a regression against `chihoai/chiho#59`.

### 4. Folder Write Smoke

Only do this if the token has `telegram.folders.write`.

Suggested behavior:

- Create a folder named `Codex Smoke Test`.
- Add a harmless peer.
- Remove the peer.
- Leave or delete the folder depending on available tools.

Record whether cleanup is possible.

### 5. Preview/Send Boundary

Only do this with explicit user approval and the right token scopes.

Safe progression:

- `outbox.preview` only.
- Verify preview/audit record.
- Do not call `outbox.sendApproved` or `message.sendDraft` unless the user chooses a safe recipient and explicitly approves sending.

### 6. Large Sync Boundary

Known issue:

- `sync.once { dialogs: 100 }` may hit `FLOOD_WAIT`.

Retest after issue `chihoai/chiho#57` is fixed:

- Run `sync.once { dialogs: 100 }`.
- Confirm the tool either backs off successfully or returns structured partial success with retry-after details.
- Sample coverage for dialogs 80-99 using `tags.get`.

## Skill Workflow Coverage

Partially covered:

- `telegram-followup-tasks`
- `telegram-meeting-recap`
- `telegram-lead-qualification`

Not yet tested end to end:

- `telegram-partner-pipeline`
- `telegram-vip-inbox`
- `telegram-deck-followup`
- `telegram-intro-request-triage`
- `telegram-support-escalation`
- `telegram-hiring-pipeline`
- `telegram-investor-updates`
- `telegram-crm-export`
- `telegram-bulk-template-message`
- `telegram-conditional-replies`
- `telegram-add-colleagues-to-group`
- `telegram-group-cleanup`

For each workflow skill:

1. Read the skill `SKILL.md`.
2. Read only the relevant `references/cloud-mcp.md` and `references/safety.md`.
3. Map the workflow to available hosted tools.
4. Run read-only steps first.
5. Use CRM mutations only on a chosen safe peer.
6. Use message, invite, or leave execution only with explicit user approval.

## Product Gaps To Watch For

- Large `sync.once` can fail with `FLOOD_WAIT` after doing partial work.
- `sync.once` invalid `dialogs` rejection was implemented in PR `chihoai/chiho#59`; live deployment and production retest are still pending.
- Some skill catalog tools may not be exposed by hosted Cloud MCP yet, especially `search.messages`, `nudge.generate`, and planned group leave tools.
- Rule cleanup/disable/delete was implemented in PR `chihoai/chiho#59`; live deployment and production retest are still pending.
- CRM cleanup paths were implemented in PR `chihoai/chiho#59`; live deployment and production retest are still pending.
- Folder write cleanup path should be confirmed.
- Preview/send tools need token scopes beyond the current read/CRM token.

## Still Not Done

- Merge/deploy Cloud PR `chihoai/chiho#59`.
- Live retest `tools/list` after deploy; expected tool count should increase from the earlier 23-tool baseline if cleanup tools are exposed to the token.
- Live retest `tags.clear`, `company.unlink`, `rules.disable`, `rules.delete`, and `tags.set { tags: [] }`.
- Live retest account-scoped CRM behavior for personal multi-account tokens.
- Live retest team-token forbidden-account behavior: switching `peer` or `accountId` outside team scope should return `403`.
- Live retest Cloud smoke script with `--mutate` only, then separately with `--mutate --crm-metadata` on a safe test peer.
- Resolve or retest `sync.once { dialogs: 100 }` / `FLOOD_WAIT` from `chihoai/chiho#57`.
- Confirm folder write tools and cleanup once a token with `telegram.folders.write` is available.
- Confirm preview/send and member/group approval tools only with explicit user approval and appropriate token scopes.
