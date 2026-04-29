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
