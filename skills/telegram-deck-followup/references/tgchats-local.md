# Local tgchats

Use local `tgchats-mcp` when available. Fall back to:

- `npm run dev -- search "deck" --limit 50 --json`
- `npm run dev -- chat <peer> --limit 50 --json`
- `npm run dev -- tasks add <peer> --due <date> --why "Follow up after sent deck" --json`
- `npm run dev -- rules add --name "Deck follow-up" --instruction "If a deck or proposal was sent and there is no later reply, create a follow-up task." --followup-days 3 --json`
