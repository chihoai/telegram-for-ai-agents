# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write` for persisted tags or tasks

Useful tools:

- `dialogs.list`
- `chat.read`
- `tags.get`
- `tags.set`
- `tasks.today`
- `summary.show`

Cloud Telegram reads and CRM metadata are separate. If `dialogs.list` or `chat.read` can see a peer but `tags.get`, `summary.show`, or other CRM tools report that chat metadata is unavailable, the peer likely has not been synced/imported into the CRM store yet. Continue with Telegram reads and ask for sync/import before persisting VIP metadata.
