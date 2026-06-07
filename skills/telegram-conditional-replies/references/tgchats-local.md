# Local tgchats

If `auth` or any Telegram command prints a QR login code, show the full QR code block and expiry to the user so they can scan it; keep the process running until login completes, 2FA is needed, or the user asks to stop.

Use local `tgchats-mcp` for rule and read tools. Use the same Cloud tool names for message execution:

- `message.sendDraft`
- `outbox.preview`
- `outbox.sendApproved`

Always call `rules.dryRun` before `rules.run` for conditional reply workflows.
