---
name: telegram-meeting-recap
description: Summarize Telegram conversations into meeting recaps, decisions, and action items. Use when the user wants a concise recap after a call, meeting, or long planning thread.
license: MIT
compatibility: Requires Chiho.ai Cloud MCP or local tgchats with Telegram read, summary, and task tools.
metadata:
  chiho.category: crm-automation
  chiho.risk: low
  chiho.requiresApproval: "false"
  chiho.cloudScopes: telegram.read, crm.write
allowed-tools: mcp(chat.read) mcp(summary.refresh) mcp(summary.show) mcp(tasks.suggest) mcp(tasks.add) mcp(nudge.generate)
---

# telegram-meeting-recap

Use this skill to turn a long Telegram thread into a recap with decisions and action items.

## Rules

- Read the relevant date range or recent message window.
- Separate facts, decisions, open questions, and action items.
- Create tasks only when the user asks to persist them.
- Do not send the recap unless routed through a preview/send workflow.

## Flow

1. Use `chat.read` for the target conversation.
2. Use `summary.refresh` to update the rolling summary when needed.
3. Extract decisions, open questions, owners, and deadlines.
4. Use `tasks.suggest` and `tasks.add` for action items when requested.
5. Optionally generate a concise follow-up nudge draft.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
