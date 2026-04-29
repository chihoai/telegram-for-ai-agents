# Local tgchats

Use local `tgchats-mcp` for rule and read tools. Use the same Cloud tool names for message execution:

- `message.sendDraft`
- `outbox.preview`
- `outbox.sendApproved`

Always call `rules.dryRun` before `rules.run` for conditional reply workflows.
