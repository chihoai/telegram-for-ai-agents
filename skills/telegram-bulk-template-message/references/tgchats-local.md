# Local tgchats

Use local `tgchats-mcp` when available. The local MCP exposes the same tool names as Chiho Cloud:

- `outbox.preview`
- `outbox.sendApproved`

The preview is persisted next to the local Telegram session so a later `outbox.sendApproved` call can execute by `previewId`.
