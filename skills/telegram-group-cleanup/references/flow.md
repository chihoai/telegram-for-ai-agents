# Group Cleanup Flow

1. List candidate groups with `dialogs.list`.
2. Read recent context for unclear groups with `chat.read`.
3. Classify each group as keep, organize, follow up, archive recommendation, or leave recommendation.
4. Use `folders.*`, `tags.set`, or `tasks.add` for approved organization actions.
5. Use `groups.leavePreview` and `groups.leaveApproved` only when policy allows execution.

Prefer recommendations and reversible organization before leaving groups.
