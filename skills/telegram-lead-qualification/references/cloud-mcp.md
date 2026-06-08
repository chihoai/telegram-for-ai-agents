# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`

Useful tools:

- `dialogs.list`
- `chat.read`
- `tags.suggest`
- `company.suggest`
- `tasks.suggest`
- `tags.set`
- `company.link`
- `tasks.add`
- `summary.refresh`

Cloud Telegram reads and CRM metadata are separate. If `dialogs.list` or `chat.read` can see a peer but CRM tools report that chat metadata is unavailable, the peer likely has not been synced/imported into the CRM store yet. Use Telegram reads for context and ask for sync/import before persisting lead tags, company links, tasks, or summaries.
