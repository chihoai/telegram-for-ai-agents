# PR #41 staging qualification

Recorded 2026-09-30 for `chihoai/telegram-for-ai-agents` PR #41. This ledger distinguishes local package checks from a hosted staging MCP connection. It does not authorize a production cutover.

## Source and local checks

- Cursor parser fix: `b446b32672064882ba29a3dda59763982bb080c2`. An opaque base64url cursor beginning with `-` previously failed parsing as a missing `--cursor` value. The parser now accepts it and still rejects another known value option in place of a cursor.
- Node 22: `npm test` passed 156 tests in 36 files; `npm run check:local-install` passed; `npm run validate:skills` validated 19 skill directories; `git diff --check` passed.
- The installed local plugin check reported 69 local MCP tools. This is a local package check, not hosted v8 behavior.

## Hosted staging v8 personal connection

- Resource: `https://stagingapi.chiho.ai/mcp/v8`. Codex MCP authentication reported OAuth after the owner completed sign-in. No bearer token, message content, or peer identifier was recorded here.
- The loaded authenticated connector catalog contained 106 unique tool names, with no missing or extra names against the prepared v8 source name list. This does not attest to the 106 returned schemas or annotations.
- `auth_status` returned authenticated with two connected Telegram accounts; `account_whoami` and `teams_list` succeeded.
- For each account, bounded reads of the private `Chiho MCP QA Forum 2026-09` supergroup returned two topics and two members. `member_get` reported membership for a member returned by the listing. `chat_capabilities_get` succeeded. The member list reported `completeness: unknown`; its two visible members must not be described as a complete export.
- On one account, `drafts_list` found no existing draft in the QA forum. `draft_save` saved a unique test draft, `drafts_list` read it back, and an empty `draft_save` cleared it. A final `drafts_list` returned zero drafts. No message was sent.

## Open gates

- The owner approved creating and cleaning up a disposable Chiho team in staging. The first `teams_create` attempt returned `Authentication required` before a result was delivered; no team mutation is claimed. A later `teams_list` also returned `Authentication required`, so creation state must be checked after the connection recovers. Team CRM reads, writes, out-of-team denial, review queue behavior, and cleanup remain untested. Existing business teams were not mutated.
- At approximately 00:33 UTC, Codex still displayed the staging entry as `OAuth`, but its tool calls stopped authenticating. Desktop logs showed MCP startup failing during OAuth metadata discovery with an HTTP transport error, followed by `tools/list` timeouts. The public staging protected-resource and authorization-server metadata endpoints later returned HTTP 200. This is a client transport/startup observation, not proof of token expiry or a backend OAuth defect. Reconnect and repeat the read gate before any further write.
- No v2–v6 candidate package was installed in a real Codex or Claude client for this PR. The PR's candidate builder does not support v8.
- Authenticated full-schema comparison, production v8 qualification, and Claude directory migration are separate release gates. The published plugin and connector remain on `/mcp`.

Treat this as **partial staging qualification**. Keep PR #41 open until its intended team and real-client checks have recorded results or the PR's release scope is explicitly narrowed.
