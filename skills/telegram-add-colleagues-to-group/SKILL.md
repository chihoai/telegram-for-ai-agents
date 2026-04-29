---
name: telegram-add-colleagues-to-group
description: Add or invite one Telegram user to selected group chats. Use when the user wants to add a colleague, teammate, contractor, or partner to Telegram groups.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with member invite write tools.
metadata:
  chiho.category: telegram-automation
  chiho.risk: high
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.read, telegram.members.invite
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(members.invitePreview) mcp(members.inviteApproved)
---

# telegram-add-colleagues-to-group

Use this skill to add or invite one Telegram user to one or more group chats.

## Rules

- Resolve the target user and target groups before preview.
- Do not invite users to unrelated groups based on name similarity alone.
- Always create an invite preview before execution.
- Explain whether execution may directly add the user or fall back to an invite link.
- Respect group limits, permission failures, and privacy failures.

## Flow

1. Use `dialogs.list` to resolve candidate groups.
2. Use `chat.read` only when group context is needed for disambiguation.
3. Call `members.invitePreview` with the target user and groups.
4. Show the preview summary and ask for approval when policy requires it.
5. Call `members.inviteApproved` with the `previewId`.
6. Report added groups, invite-link fallbacks, skipped groups, and failures.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
