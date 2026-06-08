# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`

Tools:

- `dialogs.list`
- `chat.read`
- `tasks.today`
- `tasks.suggest`
- `tasks.add`
- `tasks.done`
- `rules.*`

This skill is safe to run before Telegram write scopes are enabled because it only mutates CRM state.

Cloud Telegram reads and CRM metadata are separate. If `dialogs.list` or `chat.read` can see a peer but `tasks.suggest` or other CRM tools report that chat metadata is unavailable, the peer likely has not been synced/imported into the CRM store yet. Use Telegram reads for context and ask for sync/import before creating CRM tasks.
