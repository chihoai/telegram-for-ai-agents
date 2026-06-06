# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- search "interview" --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tags suggest <peer> --json`
- `npm run dev -- tasks suggest <peer> --json`
- `npm run dev -- tasks add <peer> --due <date> --why "<hiring next step>" --json`
