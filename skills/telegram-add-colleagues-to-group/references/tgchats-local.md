# Local tgchats

Use local `tgchats-mcp` with:

- `members.invitePreview`
- `members.inviteApproved`

The preview is persisted next to the local Telegram session so a later `members.inviteApproved` call can execute by `previewId`.
