# Cloud MCP

Recommended Chiho.ai Cloud scopes:

- `telegram.read` to inspect dialogs and the next reply.
- `telegram.message.preview` to create approval-ready challenge messages.
- `telegram.message.send` only when the user approves sending.
- `telegram.batch.write` to execute an approved outbox preview.
- `crm.write` to tag chats or create verification tasks.

Use `outbox.preview` for the challenge message. Send only after explicit approval with `outbox.sendApproved`, or use `message.sendDraft` when the user explicitly requests a direct one-off send.
