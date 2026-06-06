# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- inbox --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tags suggest <peer> --json`
- `npm run dev -- company suggest <peer> --json`
- `npm run dev -- tasks suggest <peer> --json`
- add `--apply` only when the user approves CRM writes.
