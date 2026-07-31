# Chiho AI for Claude

Connect Claude to the Telegram account you already use through Chiho's hosted
Telegram CRM. The plugin uses browser OAuth, so you never need to paste a
personal access token, Telegram API hash, or Telegram session into Claude.

## What you can do

- Inspect dialogs, search messages, and read chat history.
- Organize chats with folders, tags, companies, tasks, and summaries.
- Review follow-ups and run CRM workflows.
- Prepare guarded Telegram actions with an explicit preview, approval, and
  execution flow.

Chiho AI is the hosted package. It does not install a local Telegram client,
database, or background process. Use the separate `tgchats-local` plugin if you
want to self-host the runtime.

## Requirements

- A Chiho account with Telegram connected at
  [chiho.ai](https://chiho.ai/).
- A browser available for the OAuth sign-in and consent flow.
- For Claude Code, version 2.1.154 or later is recommended.

## Install in Claude Code

Add the Chiho marketplace and install the hosted plugin:

```bash
claude plugin marketplace add chihoai/telegram-for-ai-agents
claude plugin install chiho-telegram@chiho
claude plugin enable chiho-telegram@chiho
```

The plugin installs disabled because it connects Claude to an external service.
Enabling it is the user's explicit opt-in.

Open `/mcp`, select `chiho-cloud`, and choose **Authenticate** or **Connect**.
Complete Chiho sign-in and review the requested access in the browser.

## Install in Cowork

Install **Chiho AI** from the plugin directory, enable it, and select
**Connect** for the bundled `chiho-cloud` connector. Complete Chiho sign-in and
consent in the browser.

Until the directory submission is approved, use a direct plugin upload or add
the MCP connector at `https://api.chiho.ai/mcp` for testing.

## Verify the connection

Start with a read-only check:

> Check my Chiho connection and tell me which Telegram account is connected.

Claude should call `auth_status` and then `account_whoami`. A second safe smoke
test is:

> List my five most recent Telegram dialogs. Do not change anything.

That should call `dialogs_list` without performing a write.

## Safety and access

- Review the Chiho account or team and the requested permissions before
  consenting.
- Sends, member invitations, and group leaves use a preview, user review,
  approval, and execution flow.
- Approval records consent but does not itself execute the Telegram action.
- Treat logout, group leave, deletes, clears, unlinks, and replacements as
  destructive.
- Revoke Claude's access at
  [Agent Access](https://chiho.ai/profile/agent-access) whenever it is no longer
  needed.

## Help, privacy, and terms

- Product guide: [chiho.ai/telegram-mcp](https://chiho.ai/telegram-mcp)
- Support: [contact Chiho](https://chiho.ai/contact)
- Privacy policy: [chiho.ai/privacy](https://chiho.ai/privacy)
- Terms: [chiho.ai/terms](https://chiho.ai/terms)
- Source and issues:
  [chihoai/telegram-for-ai-agents](https://github.com/chihoai/telegram-for-ai-agents)

This plugin is licensed under the [MIT License](./LICENSE).
