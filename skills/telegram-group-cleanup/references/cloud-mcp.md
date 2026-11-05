# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`
- `telegram.folders.write`
- `telegram.groups.leave`

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

Cloud execution should still stop at recommendations and reversible organization actions unless the user approves leaving groups or policy allows automatic execution. When `groups_leave_preview` returns `approvalUrl`, give that link to the user and wait for them to approve the exact preview in Chiho, then call `groups_leave_approved`; approval alone does not leave a group.

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a group that `dialogs_list` or `chat_read` can see, the group likely has not been synced/imported into the CRM store yet. Continue with Telegram-only review and ask for sync/import before applying tags or tasks.
