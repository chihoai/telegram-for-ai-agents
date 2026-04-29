# Add Colleagues To Group Flow

1. Resolve the colleague's Telegram user id and access hash if available.
2. Resolve group candidates with `dialogs.list`.
3. Read chat context only for ambiguous group names.
4. Call `members.invitePreview`.
5. Present groups, permissions, privacy fallback behavior, and skipped groups.
6. Call `members.inviteApproved` after approval or when policy allows automatic execution.
7. Report direct adds, invite-link fallbacks, and failures.
