# Group Cleanup Flow

1. List candidate groups with `dialogs_list`.
2. Read recent context for unclear groups with `chat_read`.
3. Classify each group as keep, organize, follow up, archive recommendation, or leave recommendation.
4. Use the folder-management tool available on the selected runtime, `tags_set`, or `tasks_add` for approved organization actions.
5. Use `groups_leave_preview` and `groups_leave_approved` only when policy allows execution.

Prefer recommendations and reversible organization before leaving groups.
