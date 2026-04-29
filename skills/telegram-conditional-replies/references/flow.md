# Conditional Replies Flow

1. Clarify the condition: tag, folder, message content, inactivity, sender, or explicit peer list.
2. Inspect existing rules with `rules.list`.
3. Read representative chats with `chat.read`.
4. Create a conservative rule with `rules.add` only if persistence is requested.
5. Evaluate with `rules.dryRun`.
6. Run with `rules.run` only after the dry-run is acceptable, then inspect `rules.log`.
7. For actual replies, use a single-recipient draft or preview-first outbox flow.

Default to "recommend and draft" instead of automatic sending.
