# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write` when creating tasks

Useful tools:

- `chat.read`
- `summary.refresh`
- `summary.show`
- `tasks.suggest`
- `tasks.add`

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a peer that `chat.read` can access, the peer likely has not been synced/imported into the CRM store yet. Use Telegram reads for recap context and ask for sync/import before persisting summaries or tasks.
