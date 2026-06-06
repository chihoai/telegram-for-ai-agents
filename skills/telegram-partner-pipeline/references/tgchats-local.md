# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- search "partner" --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tags set <peer> "Partner Prospect" --json`
- `npm run dev -- company link <peer> --company "<company>" --json`
- `npm run dev -- tasks add <peer> --due <date> --why "<next step>" --json`
