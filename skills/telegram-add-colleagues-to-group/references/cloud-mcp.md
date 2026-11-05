# Cloud MCP

Required scopes:

- `telegram.read`
- `telegram.members.invite`

Tools:

- `dialogs_list`
- `chat_read`
- `members_invite_preview`
- `members_invite_approved`

Use `members_invite_preview` for every run. When it returns `approvalUrl`, give that link to the user and wait for them to approve the exact preview in Chiho, then call `members_invite_approved`. Without an approval link, invite only after the user's explicit approval in chat, unless team or token policy allows automatic execution. Approval alone does not invite anyone, and a client tool prompt does not replace it. Approval mode controls whether an approval link is required, not whether a preview is created.
