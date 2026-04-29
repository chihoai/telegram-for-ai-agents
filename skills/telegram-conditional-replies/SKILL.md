---
name: telegram-conditional-replies
description: Create, dry-run, or execute conditional Telegram reply workflows. Use when the user wants automatic or semi-automatic replies based on chat content, tags, folders, or follow-up state.
license: MIT
compatibility: Requires Chiho Cloud MCP or local tgchats with rule tools; message execution requires write-scoped tools.
metadata:
  chiho.category: telegram-automation
  chiho.risk: high
  chiho.requiresApproval: "true"
  chiho.cloudScopes: telegram.read, crm.write, telegram.message.preview, telegram.message.send, automation.rules.write
allowed-tools: mcp(dialogs.list) mcp(chat.read) mcp(rules.list) mcp(rules.add) mcp(rules.dryRun) mcp(rules.run) mcp(rules.log) mcp(message.sendDraft) mcp(outbox.preview) mcp(outbox.sendApproved)
---

# telegram-conditional-replies

Use this skill for rule-driven reply workflows.

## Rules

- Start with dry-run or recommendation mode unless the user explicitly asks to enable execution.
- Prefer CRM tasks or draft replies before automatic sends.
- Read recent history before proposing reply conditions.
- Use explicit enablement and approval for any rule that sends Telegram messages.
- Do not create broad always-on reply rules without a narrow condition and audit path.

## Flow

1. Inspect existing rules with `rules.list`.
2. Read target chats with `dialogs.list` and `chat.read` when needed.
3. Add or adjust rule instructions with `rules.add` if the user requests persistence.
4. Dry-run the rule with `rules.dryRun`.
5. Inspect outcomes with `rules.log`.
6. Run the rule with `rules.run` only after the dry-run is acceptable.
7. For actual replies, prefer preview-first `outbox.*` or single-recipient `message.sendDraft` according to token/team policy.

## Execution Boundary

Until `rules.enable`, `rules.disable`, and `rules.update` exist, treat persistent conditional replies as conservative rule creation plus explicit dry-run/run/log review.

## References

- [Flow](references/flow.md)
- [Safety](references/safety.md)
- [Cloud MCP](references/cloud-mcp.md)
- [Local tgchats](references/tgchats-local.md)
- [Templates](assets/templates.json)
- [Examples](assets/examples.json)
