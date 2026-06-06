---
name: telegram-partner-pipeline
description: Manage partnership pipeline conversations in Telegram with stages, summaries, and follow-up tasks. Use when the user wants to track BD or partner relationships from Telegram chats.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with Telegram read and CRM write tools.
metadata:
  chiho.category: crm-automation
  chiho.risk: low
  chiho.requiresApproval: "false"
  chiho.cloudScopes: telegram.read, crm.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(search.messages) mcp(tags.suggest) mcp(tags.set) mcp(company.suggest) mcp(company.link) mcp(tasks.suggest) mcp(tasks.add) mcp(summary.refresh)
---

# telegram-partner-pipeline

Use this skill to organize Telegram-based partner conversations into a pipeline.

## Rules

- Use explicit stage tags such as `Partner Prospect`, `Partner Active`, `Integration`, `Co-marketing`, or `Blocked`.
- Keep company links current.
- Create tasks for next steps, not vague reminders.
- Do not send partnership messages directly.

## Flow

1. Find partner-like conversations by tags, search, or recent dialogs.
2. Read recent context.
3. Suggest company link, stage tag, summary, and next task.
4. Persist updates only when requested or policy allows.
5. Return a pipeline grouped by stage.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
