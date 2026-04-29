---
name: telegram-bulk-template-message
description: Send an approved Telegram message template to selected chats through Chiho or tgchats. Use when the user wants a batch announcement, follow-up, update, or outreach message sent to multiple Telegram chats.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with a connected Telegram session and message write tools.
metadata:
  chiho.category: telegram-automation
  chiho.risk: high
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.message.preview, telegram.message.send, telegram.batch.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(outbox.preview) mcp(outbox.sendApproved)
---

# telegram-bulk-template-message

Use this skill to send one approved template to multiple Telegram chats.

## Rules

- Read or resolve the target audience first.
- Use packaged templates from [templates](assets/templates.json).
- Never free-form bulk send when an approved template can satisfy the request.
- Always create a preview before execution.
- Respect recipient caps, skipped-recipient reasons, rate limits, and idempotency keys.
- If policy requires approval, stop after preview and ask the user to approve.

## Cloud Flow

1. Use `dialogs.list` and `chat.read` as needed to resolve recipients.
2. Call `outbox.preview` with recipients and template/message text.
3. Show the preview summary: recipients, skipped targets, scheduled time, and risk.
4. If approved or policy allows automatic execution, call `outbox.sendApproved` with the `previewId`.
5. Return the execution report and any failures.

## Local Flow

Use the same MCP tool names as Cloud: `outbox.preview` followed by `outbox.sendApproved`.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Examples](assets/examples.json)
