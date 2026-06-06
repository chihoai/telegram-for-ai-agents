# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- search "intro" --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tasks add <peer> --due <date> --why "<next step>" --json`
- `npm run dev -- nudge <peer> --style concise --json`
