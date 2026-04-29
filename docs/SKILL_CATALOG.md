# Telegram Skill Catalog

This catalog defines the first installable Telegram workflow skills for Chiho Cloud and the self-hosted `tgchats` runtime.

## Repository Split

- `telegram-for-agents` owns public Skill directories, examples, local MCP/CLI contracts, and install guidance.
- `chiho/monorepo` owns Chiho Cloud execution: hosted MCP tools, token scopes, approval policies, audit logs, durable jobs, and UI.

## Initial Skills

| Skill | Purpose | Risk | Cloud requirements | Local requirements |
| --- | --- | --- | --- | --- |
| `telegram-bulk-template-message` | Send approved templates to selected chats | High | PR 9 write scopes: `telegram.message.preview`, `telegram.message.send`, `telegram.batch.write` | Matching `outbox.*` tools |
| `telegram-conditional-replies` | Draft or run conditional reply rules | High | `rules.*`, message write scopes for execution | `rules.*`, matching message write tools |
| `telegram-add-colleagues-to-group` | Add or invite colleagues to groups | High | PR 9 `telegram.members.invite` scope | Matching `members.*` tools |
| `telegram-followup-tasks` | Find follow-ups and create CRM tasks | Low | `telegram.read`, `crm.write` | Existing task tools |
| `telegram-group-cleanup` | Review stale groups and clean up safely | High | PR 9 folder scopes, future group leave tools | Folder tools, future group leave tools |

## Installing Skills

These skills are shipped as directories so they can be installed by clients that support skill/plugin folders, while still working as normal documentation for clients that do not.

Install options:

- Whole catalog: install or copy `skills/` into the client skill workspace.
- One workflow: install or copy a single `skills/<skill-name>/` directory.
- Docs-only client: point the agent at the relevant `SKILL.md` and let it follow the referenced MCP/CLI flows.

Client notes:

- OpenClaw: install the skill directory and configure the Chiho Cloud MCP server or local `tgchats-mcp`.
- Codex: place the skill directory in the configured skill location, or reference the repo-local `SKILL.md` directly during development.
- Claude Desktop: use the skill directory as the workflow artifact and configure MCP separately.

Every skill should remain portable: `SKILL.md` contains the routing rules, `references/` contains details, and `assets/` contains templates/examples.

## Contract Reference

PR 9 Cloud write tools are available after `chihoai/chiho#9` lands in `staging` and `main`.

| Tool | Status | Required scopes | Notes |
| --- | --- | --- | --- |
| `outbox.preview` | PR 9 Cloud baseline | `telegram.message.preview` | Creates a preview record without sending. |
| `outbox.sendApproved` | PR 9 Cloud baseline | `telegram.message.send`, `telegram.batch.write` | Executes an approved preview. |
| `message.sendDraft` | PR 9 Cloud baseline | `telegram.message.send` | Sends one message to one resolved peer. |
| `members.invitePreview` | PR 9 Cloud baseline | `telegram.members.invite` | Previews adding/inviting a user to groups. |
| `members.inviteApproved` | PR 9 Cloud baseline | `telegram.members.invite` | Executes an approved member invite preview. |
| `folders.create` | PR 9 Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
| `folders.addDialog` | PR 9 Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
| `folders.removeDialog` | PR 9 Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
| `groups.leavePreview` | Planned | `telegram.groups.leave` | Needed for `telegram-group-cleanup`. |
| `groups.leaveApproved` | Planned | `telegram.groups.leave` | Needed for `telegram-group-cleanup`. |

## Validation

Run:

```bash
npm run validate:skills
```

The validator checks:

- every `skills/*/SKILL.md` has frontmatter with `name` and `description`
- skill directory names match frontmatter names
- local Markdown links point to existing files
- `allowed-tools` entries reference known local, PR 9 Cloud, or planned Skill tools
- JSON files in skill `assets/` parse successfully
- `skills/catalog.json` points to existing skill directories and assets

## Productization

For Cloud/UI rollout guidance, see [Skill Productization](./SKILL_PRODUCTIZATION.md).
