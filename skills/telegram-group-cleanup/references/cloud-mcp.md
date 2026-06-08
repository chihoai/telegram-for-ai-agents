# Cloud MCP

Tools:

- `dialogs.list`
- `chat.read`
- `folders.list`
- `folders.create`
- `folders.addDialog`
- `folders.removeDialog`
- `tags.set`
- `tasks.add`
- `groups.leavePreview`
- `groups.leaveApproved`

Cloud execution should still stop at recommendations and reversible organization actions unless the user approves leaving groups or policy allows automatic execution.

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a group that `dialogs.list` or `chat.read` can see, the group likely has not been synced/imported into the CRM store yet. Continue with Telegram-only review and ask for sync/import before applying tags or tasks.
