# chiho.ai/telegram-skills Implementation Plan

## Goal

Build a public `chiho.ai/telegram-skills` catalog page that presents Telegram workflow skills like an app store, lets users inspect packaged skills, and gives contributors a clear path to request or submit new skills.

This implementation should happen in the Chiho web app repo:

```text
chiho/monorepo
```

The Telegram skill source repo is also available locally and should be treated as the source of truth for packaged skills:

```text
chihoai/telegram-for-ai-agents
```

GitHub source:

```text
https://github.com/chihoai/telegram-for-ai-agents
```

## Source Of Truth

Use the packaged catalog from `telegram-for-agents`:

```text
skills/catalog.json
skills/<skill-name>/SKILL.md
skills/<skill-name>/assets/templates.json
skills/<skill-name>/assets/examples.json
skills/<skill-name>/references/*.md
```

Recommended production data source:

1. Fetch `skills/catalog.json` from the GitHub repository at build time or on the server.
2. Fetch each skill's `SKILL.md`, templates, and examples only when needed for detail pages.
3. Cache responses with a conservative revalidation interval.
4. Prefer server-side fetching over client-side GitHub API calls to avoid rate-limit and CORS surprises.

For local development in `chiho/monorepo`, either:

- read from a sibling checkout of `chihoai/telegram-for-ai-agents`, or
- configure an env var such as `TELEGRAM_SKILLS_REPO_PATH` that points at a local checkout.

## Page Structure

Route:

```text
/telegram-skills
```

Primary sections:

- Header: "Telegram Skills" with short copy explaining workflow skills for Telegram CRM automation.
- Filters: category, risk, runtime, requires approval, search.
- Skill grid/list: name, description, category, risk, required scopes, supported runtimes, approval badge.
- Skill detail view: full description, flow summary, templates/examples, allowed tools, GitHub source link.
- Wanted skills: GitHub issues filtered by `label:telegram-skill`.
- Contribution CTA: Add SKILL button.

Avoid making this page only a marketing landing page. The first viewport should show the actual catalog and controls.

## Catalog Data Model

Normalize `skills/catalog.json` into:

```ts
type TelegramSkill = {
  name: string
  displayName: string
  category: string
  risk: "low" | "medium" | "high"
  requiresApproval: boolean
  path: string
  requiredCloudScopes: string[]
  supportedRuntimes: string[]
  templates: string
  examples: string
  description?: string
  sourceUrl: string
}
```

Optional detail metadata can be parsed from `SKILL.md` frontmatter:

- `description`
- `compatibility`
- `allowed-tools`
- `metadata.chiho.*`

If parsing frontmatter in the web app, use a real parser such as `gray-matter` rather than ad hoc string splitting.

## Wanted Skills

Wanted skills should come from GitHub issues with a specific label:

```text
telegram-skill
```

Other bugs, enhancements, and repo issues can remain in the same GitHub repository. The page should filter specifically:

```text
repo:chihoai/telegram-for-ai-agents label:telegram-skill state:open
```

Display:

- issue title
- labels
- creation date
- comment count
- link to GitHub issue

Recommended labels to create:

- `telegram-skill`: wanted or proposed Telegram workflow skill
- `skill-submission`: contributor is proposing a packaged skill
- `skill-needs-review`: maintainers need to inspect safety, scopes, or implementation
- `skill-accepted`: accepted for implementation

## Add SKILL Button

Use a split-button or menu with two explicit actions.

### Request A Skill

Best first implementation.

Behavior:

1. Open a GitHub Issue Form for the `chihoai/telegram-for-ai-agents` repo.
2. Prefill or instruct users to use the `telegram-skill` label.
3. Ask for:
   - skill name
   - problem/user flow
   - desired trigger phrase
   - required Telegram actions
   - whether it sends messages or only mutates CRM state
   - approval expectations
   - example prompts

Target URL shape:

```text
https://github.com/chihoai/telegram-for-ai-agents/issues/new?labels=telegram-skill&title=Skill%20request%3A%20
```

If GitHub Issue Forms are available, create `.github/ISSUE_TEMPLATE/telegram_skill.yml` in `telegram-for-agents` and route to that template.

### Submit A Skill

Second implementation, after the request flow works.

MVP behavior:

1. Link to a contributor guide in `telegram-for-agents`.
2. Explain the expected directory shape:

```text
skills/<skill-name>/SKILL.md
skills/<skill-name>/references/flow.md
skills/<skill-name>/references/safety.md
skills/<skill-name>/references/cloud-mcp.md
skills/<skill-name>/references/tgchats-local.md
skills/<skill-name>/assets/templates.json
skills/<skill-name>/assets/examples.json
```

3. Link to GitHub's compare/fork flow.

Better v2 behavior:

1. Web form collects skill fields.
2. The app generates a scaffold from those fields.
3. User authenticates with GitHub.
4. A GitHub App creates a branch in the user's fork or a maintainer-owned staging branch.
5. The app commits the scaffold and opens a pull request against `chihoai/telegram-for-ai-agents`.
6. PR body includes risk, required scopes, validation checklist, and generated file list.

Do not try to silently open PRs without GitHub auth. GitHub issue creation is the low-friction path; PR creation requires either GitHub OAuth/App installation or a user-owned fork flow.

## Skill Detail Actions

Each skill card should expose:

- View details
- View source on GitHub
- Use with Chiho.ai Cloud
- Use self-hosted tgchats
- Request improvement

For high-risk skills, show a clear approval requirement badge. High-risk includes bulk sends, member invites, group cleanup, and workflows that can send or preview outbound messages.

## Implementation Steps In chiho/monorepo

1. Locate the existing web app route structure and design system.
2. Add a server-side data loader for the Telegram skill catalog.
3. Add a `telegram-skills` route.
4. Render a dense catalog-first interface with filters.
5. Add skill detail modal or detail route.
6. Add GitHub wanted-skills loader filtered by `telegram-skill`.
7. Add Add SKILL menu:
   - Request A Skill: GitHub issue URL with `telegram-skill`.
   - Submit A Skill: contributor guide or PR scaffold flow.
8. Add loading, empty, error, and degraded states.
9. Add tests for catalog normalization and GitHub issue filtering.
10. Verify the page in desktop and mobile browser screenshots.

## Implementation Steps In telegram-for-agents

These can be done from the local repo:

```text
chihoai/telegram-for-ai-agents
```

Recommended follow-up work:

1. Add `.github/ISSUE_TEMPLATE/telegram_skill.yml`.
2. Add or document the `telegram-skill` label.
3. Add a contributor guide for skill submissions.
4. Keep `skills/catalog.json` updated whenever a skill is added.
5. Run `npm run validate:skills` before accepting PRs.

## Validation

For the skill source repo:

```bash
npm run validate:skills
```

For the web app:

- Unit test catalog parsing.
- Unit test GitHub issue filtering for `telegram-skill`.
- Browser-check `/telegram-skills` at desktop and mobile widths.
- Confirm the Add SKILL issue link includes `labels=telegram-skill`.
- Confirm unrelated GitHub issues do not appear in the wanted-skills section.
