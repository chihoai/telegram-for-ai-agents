# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- chat <peer> --limit 100 --json`
- `npm run dev -- summary refresh <peer> --json`
- `npm run dev -- tasks suggest <peer> --json`
- `npm run dev -- tasks add <peer> --due <date> --why "<action item>" --json`
