---
name: telegram-intro-request-triage
description: Detect and triage Telegram intro requests, then create follow-up tasks or response drafts. Use when the user wants to handle requests for introductions, referrals, investor intros, hiring intros, or partner handoffs.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with Telegram read and CRM task tools; message sending remains preview-first.
metadata:
  chiho.category: crm-automation
  chiho.risk: medium
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.read, crm.write, telegram.message.preview
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(search.messages) mcp(tasks.suggest) mcp(tasks.add) mcp(tags.set) mcp(nudge.generate) mcp(outbox.preview)
---

# telegram-intro-request-triage

Use this skill to process Telegram intro requests without losing context or sending premature replies.

## Rules

- Identify requester, target, requested reason, urgency, and required consent.
- Create a task when an intro needs follow-up.
- Use `nudge.generate` or `outbox.preview` only for draft/preview behavior.
- Never send an intro or disclose contact details without explicit approval.
- Tag chats with `Intro Request` when persistence is requested.

## Flow

1. Use `dialogs.list` or `search.messages` to find intro requests.
2. Use `chat.read` for context around each request.
3. Extract requester, target, ask, urgency, and missing information.
4. Use `tasks.add` for the next step or `tasks.suggest` when uncertain.
5. Optionally create a response preview.
6. Return grouped requests: ready, needs clarification, blocked, and done.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
