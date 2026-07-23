# Cloud MCP

Recommended Chiho.ai Cloud scopes:

- `telegram.read` to inspect dialogs and chat history.
- `telegram.message.preview` to create approval-ready challenge messages.
- `telegram.message.send` only when the user approves sending.
- `crm.write` to tag chats or create verification tasks.

Use `outbox_preview` for the challenge message. Send only after explicit approval through the configured approved-send path, or use `message_send_draft` when the user explicitly requests a direct one-off send.
