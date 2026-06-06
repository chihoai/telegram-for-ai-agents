# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- search "urgent" --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tags set <peer> Support Escalated --json`
- `npm run dev -- tasks add <peer> --due <date> --priority high --why "<support escalation>" --json`
- `npm run dev -- rules add --name "Support escalation" --instruction "Create a high-priority task when a customer reports an urgent bug, outage, payment issue, or customer risk." --tag Escalated --followup-days 1 --json`
