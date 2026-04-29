---
name: telegram-group-cleanup
description: Review Telegram group chats and recommend cleanup actions such as archiving, organizing into folders, tagging, or leaving stale groups. Use when the user wants to reduce noisy or low-value Telegram groups.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with read tools; leaving groups requires group leave write tools.
metadata:
  chiho.category: telegram-organization
  chiho.risk: high
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.read, crm.write, telegram.folders.write, telegram.groups.leave
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(folders.list) mcp(folders.create) mcp(folders.addDialog) mcp(folders.removeDialog) mcp(tags.set) mcp(tasks.add) mcp(groups.leavePreview) mcp(groups.leaveApproved)
---

# telegram-group-cleanup

Use this skill to identify and clean up stale or noisy Telegram groups.

## Rules

- Start in recommendation mode.
- Separate reversible actions from destructive or hard-to-reverse actions.
- Folder moves, tags, and tasks are lower risk than leaving groups.
- Leaving groups must use preview-first execution and explicit approval unless team/token policy says otherwise.
- Never leave groups based only on inactivity; include context and reason.

## Flow

1. Use `dialogs.list` to find group candidates.
2. Use `chat.read` to inspect recent context for uncertain groups.
3. Recommend actions: keep, tag, add follow-up task, move folder, archive recommendation, or leave.
4. Use `folders.*`, `tags.set`, or `tasks.add` for approved organization actions.
5. Use `groups.leavePreview` and `groups.leaveApproved` only when the user approves or policy explicitly allows automatic execution.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
