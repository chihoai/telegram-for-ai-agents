# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.read`

Useful tools:

- `search.messages`
- `dialogs.list`
- `chat.read`
- `tags.get`
- `company.get`
- `tasks.today`
- `summary.show`

Cloud Telegram reads and CRM metadata are separate. If `dialogs.list` or `chat.read` can see a peer but CRM tools report that metadata is unavailable, that peer likely has not been synced/imported into the CRM store yet. Continue with Telegram reads where possible and ask for sync/import before treating the peer as export-ready CRM data.
