# Chiho.ai Telegram CRM for Claude

Connect Claude to the Telegram account you already use through Chiho's hosted
Telegram CRM. The plugin uses browser OAuth, so you never need to paste a
personal access token, Telegram API hash, or Telegram session into Claude.

## What you can do

- Inspect dialogs, search messages, and read chat history.
- Organize chats with folders, tags, companies, tasks, and summaries.
- Review follow-ups and run CRM workflows.
- Discover authorized teams and manage shared conversations, assignments, tasks,
  templates, opportunities, and review queues.
- Prepare guarded Telegram actions with an explicit preview, approval, and
  execution flow.

Chiho.ai Telegram CRM is the hosted package. It does not install a local
Telegram client, database, or background process. Use the separate
`tgchats-local` plugin if you want to self-host the runtime.

## Upgrade to the stable MCP endpoint

Version 2.0.1 connects to `https://api.chiho.ai/mcp`. The stable endpoint adds
connection identity checks and explicitly authorized extended Telegram, CRM,
personal workflow and team tools. Existing connections on this stable endpoint
retain their permissions and selected-team binding. Refresh cannot add access;
new tools require explicit `chiho.crm.extended` consent and their individual
permissions.

Users upgrading from the versioned `/mcp/v8` or `/mcp/v9` endpoints must
reconnect `chiho-cloud` for the stable resource. Versioned grants cannot
authorize the stable endpoint. Your Chiho data and connected Telegram accounts
stay in Chiho. A new Telegram login is needed only if that session is stale.

Chiho Telegram is listed in [Claude’s directory](https://claude.ai/directory/chiho-telegram)
with the stable endpoint. A connector added from the directory earlier keeps
its original URL, shown under **Custom**. If that URL is versioned, remove the
connector, re-add Chiho Telegram from the directory, and sign in again.
Updating a plugin and updating its directory connector are separate release
steps. See [Claude’s endpoint migration guide](https://claude.com/docs/connectors/directory#recognize-when-a-connectors-endpoint-changes).

## Requirements

- A Chiho account with Telegram connected at
  [chiho.ai](https://chiho.ai/).
- A browser available for the OAuth sign-in and consent flow.
- Claude Code 2.1.154 or later. Earlier versions ignore the
  disabled-by-default setting and enable the plugin when it is installed.

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

Add the [Chiho Telegram connector](https://claude.ai/directory/chiho-telegram)
from Claude’s directory and select **Connect**. The plugin, which adds the
bundled skill, is not in the directory yet: upload this plugin folder directly,
enable it, and select **Connect** for its `chiho-cloud` connector. Use one or
the other, not both. Complete Chiho sign-in and consent in the browser.

## Example prompts

Start with these read-only checks:

> Check my Chiho connection and tell me which Telegram account is connected.

Claude should call `get_profile`, `auth_status`, and then `account_whoami`.
It must stop if the returned profile differs from the expected saved connection.

> List my five most recent Telegram dialogs. Do not change anything.

That should call `dialogs_list` without performing a write.

> Show my Telegram follow-up tasks due today. Do not change anything.

That should call `tasks_today` without performing a write.

## Safety and access

- Review the Chiho account or team and the requested permissions before
  consenting.
- For scheduled work, retain the intended profile and Telegram account IDs in
  that task's instructions. Check `get_profile` on every run and stop on a
  mismatch. A selection in another chat does not verify the task's connection.
- Batch sends, member invitations, and group leaves use a preview, user review,
  approval, and execution flow.
- When a preview returns `approvalUrl`, the user must approve its exact details
  in Chiho before the executor runs. Approval does not itself execute the action.
- Use `outbox_preview_extended` and `outbox_send_approved_extended` for expanded
  previews and team-review results. Keep each preview and executor in the same
  tool family and saved connection. Original tool schemas remain available to
  existing stable connections.
- `message_send_draft_extended` sends or schedules one message directly without creating
  a Chiho preview record. Use it only when the user explicitly asks to send or
  schedule one message to a specific chat and approves the client tool call.
- Treat logout, group leave, deletes, clears, unlinks, and replacements as
  destructive.
- Revoke Claude's access at
  [Agent Access](https://chiho.ai/profile/agent-access) whenever it is no longer
  needed.

## Help, privacy, and terms

- Product guide: [chiho.ai/telegram-mcp](https://chiho.ai/telegram-mcp)
- Support: [contact Chiho](https://chiho.ai/contact)
- Security reports: [iwant@chiho.ai](mailto:iwant@chiho.ai)
- Privacy policy: [chiho.ai/privacy](https://chiho.ai/privacy)
- Terms: [chiho.ai/terms](https://chiho.ai/terms)
- Source and issues:
  [chihoai/telegram-for-ai-agents](https://github.com/chihoai/telegram-for-ai-agents)
- ChatGPT:
  [Chiho AI in the ChatGPT plugins directory](https://chatgpt.com/plugins/plugin_asdk_app_6a6991cf8748819194345fca1c8d7516)

This plugin is licensed under the [MIT License](./LICENSE).
