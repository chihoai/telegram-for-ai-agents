# Cloud MCP

Required scopes:

- `telegram.read`
- `telegram.message.preview`
- `telegram.message.send`
- `telegram.batch.write`

Tools:

- `dialogs.list`
- `chat.read`
- `outbox.preview`
- `outbox.sendApproved`

Approval behavior depends on token and team policy. Even with `never_ask`, create a preview first so the run has audit, idempotency, skipped-recipient reporting, and rate-limit metadata.
