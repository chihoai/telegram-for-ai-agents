# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`

Useful tools:

- `search.messages`
- `chat.read`
- `tags.set`
- `company.link`
- `tasks.add`
- `summary.refresh`

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a peer that `chat.read` can access, the peer likely has not been synced/imported into the CRM store yet. Use Telegram reads for context and ask for sync/import before persisting partner CRM metadata.
