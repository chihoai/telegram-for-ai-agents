# Telegram Skill Catalog

This catalog defines the first installable Telegram workflow skills for Chiho.ai Cloud and the self-hosted `tgchats` runtime.

## Repository Split

- `telegram-for-agents` owns public Skill directories, examples, local MCP/CLI contracts, and install guidance.
- `chiho/monorepo` owns Chiho.ai Cloud execution: the hosted CRM table UI, MCP tools, token scopes, approval policies, audit logs, and durable jobs.

## Initial Skills

| Skill | Purpose | Risk | Cloud requirements | Local requirements |
| --- | --- | --- | --- | --- |
| `telegram-bulk-template-message` | Send approved templates to selected chats | High | `telegram.message.preview`, `telegram.message.send`, `telegram.batch.write` | Matching `outbox.*` tools |
| `telegram-conditional-replies` | Draft or run conditional reply rules | High | `rules.*`, message write scopes for execution | `rules.*`, matching message write tools |
| `telegram-add-colleagues-to-group` | Add or invite colleagues to groups | High | `telegram.members.invite` | Matching `members.*` tools |
| `telegram-followup-tasks` | Find follow-ups and create CRM tasks | Low | `telegram.read`, `crm.write` | Existing task tools |
| `telegram-group-cleanup` | Review stale groups and clean up safely | High | Folder write scopes, future group leave tools | Folder tools, future group leave tools |
| `telegram-lead-qualification` | Qualify inbound Marketing and BD leads | Low | `telegram.read`, `crm.write` | Existing tag/company/task tools |
| `telegram-intro-request-triage` | Detect intro asks and create follow-up tasks or previews | Medium | `telegram.read`, `crm.write`, preview scope | Search, task, and preview tools |
| `telegram-deck-followup` | Follow up after decks, proposals, or docs were sent | Low | `telegram.read`, `crm.write` | Search and task tools |
| `telegram-vip-inbox` | Surface important contacts before general inbox triage | Low | `telegram.read`, `crm.write` | Dialog, metadata, and task tools |
| `telegram-meeting-recap` | Summarize long threads into recaps and action items | Low | `telegram.read`, `crm.write` | Summary and task tools |
| `telegram-crm-export` | Prepare filtered CRM exports and local backups | Medium | `telegram.read`, `crm.read` | Read tools plus local export CLI |
| `telegram-partner-pipeline` | Track partner conversations by stage and next step | Low | `telegram.read`, `crm.write` | Tag/company/task tools |
| `telegram-investor-updates` | Track investor update follow-ups and drafts | Medium | `telegram.read`, `crm.write`, preview scope | Summary, task, and preview tools |
| `telegram-hiring-pipeline` | Track candidates and hiring follow-ups | Medium | `telegram.read`, `crm.write` | Search, tag, and task tools |
| `telegram-support-escalation` | Detect urgent support issues and create escalation tasks | Medium | `telegram.read`, `crm.write` | Search, rules, tags, and task tools |

## Installing Skills

These skills are shipped as directories so they can be installed by clients that support skill/plugin folders, while still working as normal documentation for clients that do not.

Install options:

- Published workflow: install a single skill with the `skills` CLI:

```bash
npx skills add https://chiho.ai/telegram-skills/telegram-add-colleagues-to-group
```

- Docs-only/manual inspection: fetch the skill instructions directly:

```bash
curl -fsSL https://chiho.ai/telegram-skills/telegram-add-colleagues-to-group/SKILL.md
```

- Whole catalog: install or copy `skills/` into the client skill workspace.
- One workflow: install or copy a single `skills/<skill-name>/` directory.
- Docs-only client: point the agent at the relevant `SKILL.md` and let it follow the referenced MCP/CLI flows.

Use `npx skills add` when you want the skill installed into a supported agent workspace. Use `curl` when you only want to inspect or pipe the `SKILL.md` instructions. Replace `telegram-add-colleagues-to-group` with any skill name from the catalog.

Client notes:

- OpenClaw: install the skill directory and configure the Chiho.ai Cloud MCP server or local `tgchats-mcp`.
- Codex: place the skill directory in the configured skill location, or reference the repo-local `SKILL.md` directly during development.
- Claude Desktop: use the skill directory as the workflow artifact and configure MCP separately.

Every skill should remain portable: `SKILL.md` contains the routing rules, `references/` contains details, and `assets/` contains templates/examples.

## Contract Reference

Cloud write tools are the hosted MCP baseline for skills that preview, send, invite, or organize Telegram state.

| Tool | Status | Required scopes | Notes |
| --- | --- | --- | --- |
| `outbox.preview` | Cloud baseline | `telegram.message.preview` | Creates a preview record without sending. |
| `outbox.sendApproved` | Cloud baseline | `telegram.message.send`, `telegram.batch.write` | Executes an approved preview. |
| `message.sendDraft` | Cloud baseline | `telegram.message.send` | Sends one message to one resolved peer. |
| `members.invitePreview` | Cloud baseline | `telegram.members.invite` | Previews adding/inviting a user to groups. |
| `members.inviteApproved` | Cloud baseline | `telegram.members.invite` | Executes an approved member invite preview. |
| `folders.create` | Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
| `folders.addDialog` | Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
| `folders.removeDialog` | Cloud baseline | `telegram.folders.write` | Personal-scope tokens only. |
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
- `allowed-tools` entries reference known local, Cloud baseline, or planned Skill tools
- JSON files in skill `assets/` parse successfully
- `skills/catalog.json` points to existing skill directories and assets

## Productization

For Cloud/UI rollout guidance, see [Skill Productization](./SKILL_PRODUCTIZATION.md).
