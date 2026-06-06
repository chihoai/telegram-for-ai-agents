# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- inbox --limit 50 --json`
- `npm run dev -- tags ls --json`
- `npm run dev -- tasks today --json`
- `npm run dev -- open <peer> --json`
- `npm run dev -- chat <peer> --limit 30 --json`
