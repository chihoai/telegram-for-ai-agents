# Cloud MCP

Required scopes:

- `telegram.read`
- `telegram.message.preview`
- `telegram.message.send`
- `telegram.batch.write`

Tools:

- `dialogs_list`
- `chat_read`
- `outbox_preview`
- `outbox_send_approved`

Approval behavior depends on token and team policy. Even with `never_ask`, create a preview first so the run has audit, idempotency, skipped-recipient reporting, and rate-limit metadata. When `outbox_preview` returns `approvalUrl`, give that link to the user and wait for them to approve the exact preview in Chiho, then call `outbox_send_approved`; approval alone does not send. Without an approval link, send only after the user's explicit approval in chat, unless team or token policy allows automatic execution.
