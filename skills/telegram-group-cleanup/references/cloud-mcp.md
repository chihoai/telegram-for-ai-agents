# Cloud MCP

Tools:

- `dialogs_list`
- `chat_read`
- `folders_list`
- `folders_create`
- `folders_add_dialog`
- `folders_remove_dialog`
- `tags_set`
- `tasks_add`
- `groups_leave_preview`
- `groups_leave_approved`

Cloud execution should still stop at recommendations and reversible organization actions unless the user approves leaving groups or policy allows automatic execution.

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a group that `dialogs_list` or `chat_read` can see, the group likely has not been synced/imported into the CRM store yet. Continue with Telegram-only review and ask for sync/import before applying tags or tasks.
