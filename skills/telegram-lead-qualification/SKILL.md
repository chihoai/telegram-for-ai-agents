---
name: telegram-lead-qualification
description: Qualify Telegram conversations as sales or partnership leads and create CRM tags, company links, tasks, and summaries. Use when the user wants to score inbound chats, identify promising leads, or triage Marketing and BD opportunities.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with Telegram read, CRM write, and AI suggestion tools.
metadata:
  chiho.category: crm-automation
  chiho.risk: low
  chiho.requiresApproval: "false"
  chiho.cloudScopes: telegram.read, crm.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(tags.suggest) mcp(tags.set) mcp(company.suggest) mcp(company.link) mcp(tasks.suggest) mcp(tasks.add) mcp(summary.refresh) mcp(summary.show)
---

# telegram-lead-qualification

Use this skill to turn Telegram conversation context into a qualified CRM lead record.

## Rules

- Read enough recent context before making a qualification.
- Prefer AI suggestions for tags, company, and tasks before persisting.
- Use explicit lead-stage tags such as `Lead`, `Qualified`, `Partner`, `Customer`, or `Investor`.
- Keep the qualification reason concise and tied to conversation evidence.
- Do not send Telegram messages.

## Flow

1. Use `dialogs.list` to find candidate chats when no peer is specified.
2. Use `chat.read` to inspect recent context.
3. Use `tags.suggest`, `company.suggest`, and `tasks.suggest`.
4. Use `summary.refresh` when the chat lacks current context.
5. Apply tags, company links, and tasks only when requested or when policy allows automatic CRM writes.
6. Return the qualification, evidence, next action, and any persisted changes.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
