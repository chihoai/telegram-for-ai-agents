# Cloud MCP

Required scopes:

- `telegram.read`
- `crm.write`

Useful tools:

- `search.messages`
- `chat.read`
- `tasks.add`
- `nudge.generate`
- `rules.add`

Cloud Telegram reads and CRM metadata are separate. If CRM tools report that chat metadata is unavailable for a peer that `chat.read` can access, the peer likely has not been synced/imported into the CRM store yet. Use `chat.read` for context and ask for sync/import before persisting follow-up CRM changes.
