# Skill Productization

Use `skills/catalog.json` as the machine-readable source for catalog discovery.

## Cloud Install Model

1. Read `skills/catalog.json`.
2. Show available skills with risk, required scopes, supported runtimes, and template count.
3. Let the user or team admin enable a skill for specific Telegram accounts.
4. Require token scopes to cover the selected skill.
5. Import packaged templates from `assets/templates.json` into editable user/team records.
6. Record every run with skill name, runtime, account, tool calls, preview id, approval mode, result, and failures.

## Team Policy

Team policy should sit above token scopes:

- token scopes decide what is technically possible
- team policy decides which skills and accounts can use those scopes
- approval policy decides whether a human must confirm previews

Recommended policy controls:

- enable or disable each skill per team
- allow write scopes per Telegram account
- force `ask_always` for high-risk skills
- restrict message skills to imported templates
- expose audit logs to team admins

## Template Handling

The versioned source for packaged templates is the skill asset file:

```text
skills/<skill-name>/assets/templates.json
```

Cloud should import copies into database records when a user installs or enables a skill. User/team edits should modify the database copy, not the packaged asset.

## Runtime Status

- Chiho.ai Cloud MCP: hosted read/write tools with scoped tokens, previews, approvals, and audit logs.
- Local `tgchats-mcp`: exposes matching write tool names for local parity.
- CLI: remains available for local workflows, but skills should prefer MCP when possible.

## Public Catalog And Requests

The public `chiho.ai/telegram-skills` page should use this repository as the packaged skill source of truth:

- catalog: `skills/catalog.json`
- skill package: `skills/<skill-name>/`
- local repo path during development: configure `TELEGRAM_SKILLS_REPO_PATH` to point at a checkout of `chihoai/telegram-for-ai-agents`

Wanted skills should be represented by GitHub issues with the `telegram-skill` label. Other issues can stay in the same repository; the public wanted-skills list should filter specifically on `label:telegram-skill`.
