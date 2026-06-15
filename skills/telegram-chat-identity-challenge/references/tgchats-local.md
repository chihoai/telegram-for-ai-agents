# Local tgchats

For local self-hosted usage, prefer JSON command surfaces:

```bash
npm run dev -- chat <peer> --limit 20 --json
npm run dev -- tags set <peer> "Needs Manual Verification"
npm run dev -- tasks add <peer> --why "Contact did not complete identity challenge"
```

Use local preview or draft-send command surfaces when available. Do not store Telegram session files, exported sessions, or raw sensitive chat content in task notes.
