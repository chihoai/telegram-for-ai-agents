# Cloud MCP

Read/CRM tools:

- `rules_list`
- `rules_add`
- `rules_run`
- `rules_log`
- `dialogs_list`
- `chat_read`

Write tools for message execution:

- `message_send_draft`
- `outbox_preview`
- `write_approve_preview`

Chiho Cloud does not expose the local-only rule dry-run tool. Review the rule conditions and affected scope before calling `rules_run`. Use `outbox_preview` for a non-sending message preview, then `write_approve_preview` only after explicit approval. `message_send_draft` sends directly.
