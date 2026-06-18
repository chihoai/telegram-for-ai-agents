# Local tgchats

For local self-hosted usage, prefer JSON command surfaces:

```bash
npm run dev -- chat <peer> --limit 20 --json
npm run dev -- outbox preview --payload '{"peers":["<peer>"],"text":"Quick verification: please reply with only the number you get from 17 + 6, followed by the last word in this message."}'
npm run dev -- tags set <peer> "Needs Manual Verification"
npm run dev -- tasks add <peer> --due 2026-02-24 --why "Contact did not complete human verification challenge"
```

Use `outbox send-approved <previewId>` only after the user approves the preview. Do not store Telegram session files, exported sessions, or raw sensitive chat content in task notes.
