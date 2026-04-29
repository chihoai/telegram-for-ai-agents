---
name: telegram-followup-tasks
description: Find Telegram chats that need follow-up and create CRM tasks. Use when the user wants a follow-up queue, task suggestions, or reminders based on Telegram conversations.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with read and CRM task tools.
metadata:
  chiho.category: crm-automation
  chiho.risk: low
  chiho.requiresApproval: "false"
  chiho.cloudScopes: telegram.read, crm.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(tasks.today) mcp(tasks.suggest) mcp(tasks.add) mcp(tasks.done) mcp(rules.list) mcp(rules.add) mcp(rules.run) mcp(rules.log)
---

# telegram-followup-tasks

Use this skill to turn Telegram conversation context into follow-up tasks.

## Rules

- Prefer task suggestions before creating tasks unless the user already gave exact task details.
- Keep task `why` text concise and tied to the conversation.
- Use due dates that are explicit or easily inferred from the user request.
- This skill mutates CRM state, not Telegram messages.

## Flow

1. Use `tasks.today` when the user asks for the current follow-up queue.
2. Use `dialogs.list` to find candidate chats.
3. Use `chat.read` for chats that need context.
4. Use `tasks.suggest` for AI-generated follow-up candidates.
5. Use `tasks.add` when the user approves suggestions or gives direct instructions.
6. Use `rules.*` when the user wants recurring follow-up behavior.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
