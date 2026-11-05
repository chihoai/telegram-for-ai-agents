# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`
- `telegram.message.preview`
- `telegram.message.send`
- `telegram.batch.write`
- `automation.rules.write`

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
- `outbox_send_approved`

Chiho Cloud does not expose the local-only rule dry-run tool. Review the rule conditions and affected scope before calling `rules_run`. Use `outbox_preview` for a non-sending message preview. When it returns `approvalUrl`, give that link to the user and wait for them to approve the exact preview in Chiho, then call `outbox_send_approved` to execute the approved preview. Without an approval link, execute it only after the user's explicit approval in chat. Approval alone does not send. `message_send_draft` sends directly.
