# Local tgchats

Use local `tgchats-mcp` for reads, tags, tasks, folders, and group leave previews:

- `groups.leavePreview`
- `groups.leaveApproved`

The preview is persisted next to the local Telegram session so a later `groups.leaveApproved` call can execute by `previewId`.
