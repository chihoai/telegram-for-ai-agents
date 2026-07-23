export interface McpToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpToolClientMetadata {
  title: string;
  annotations: McpToolAnnotations;
  outputSchema: Record<string, unknown>;
}

const SUCCESS_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  required: ["ok"],
  properties: {
    ok: { type: "boolean", const: true },
  },
};

const READ_INTERNAL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} satisfies McpToolAnnotations;

const READ_EXTERNAL = {
  ...READ_INTERNAL,
  openWorldHint: true,
} satisfies McpToolAnnotations;

const WRITE_INTERNAL = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} satisfies McpToolAnnotations;

const WRITE_EXTERNAL = {
  ...WRITE_INTERNAL,
  openWorldHint: true,
} satisfies McpToolAnnotations;

function metadata(
  title: string,
  annotations: McpToolAnnotations,
): McpToolClientMetadata {
  return {
    title,
    annotations,
    outputSchema: SUCCESS_OUTPUT_SCHEMA,
  };
}

const TOOL_METADATA: Record<string, McpToolClientMetadata> = {
  "auth.status": metadata("Check local Telegram connection", READ_INTERNAL),
  "account.whoami": metadata("Show the local Telegram account", READ_EXTERNAL),
  "dialogs.list": metadata("List Telegram chats", READ_EXTERNAL),
  "chat.read": metadata("Read a Telegram chat", READ_EXTERNAL),
  "search.messages": metadata("Search Telegram messages", READ_EXTERNAL),
  "folders.list": metadata("List Telegram folders", READ_EXTERNAL),
  "folders.update": metadata("Update Telegram folders", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "folders.create": metadata("Create a Telegram folder", WRITE_EXTERNAL),
  "folders.addDialog": metadata(
    "Add a chat to a Telegram folder",
    WRITE_EXTERNAL,
  ),
  "folders.removeDialog": metadata("Remove a chat from a Telegram folder", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "outbox.preview": metadata("Prepare Telegram messages", WRITE_EXTERNAL),
  "outbox.sendApproved": metadata("Send approved Telegram messages", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
    idempotentHint: true,
  }),
  "message.sendDraft": metadata("Send a Telegram message", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "members.invitePreview": metadata(
    "Prepare Telegram member invites",
    WRITE_EXTERNAL,
  ),
  "members.inviteApproved": metadata("Invite approved Telegram members", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
    idempotentHint: true,
  }),
  "groups.leavePreview": metadata(
    "Prepare leaving Telegram groups",
    WRITE_EXTERNAL,
  ),
  "groups.leaveApproved": metadata("Leave approved Telegram groups", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
    idempotentHint: true,
  }),
  "tags.get": metadata("Show CRM tags", READ_INTERNAL),
  "tags.set": metadata("Set CRM tags", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "tags.clear": metadata("Clear CRM tags", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "tags.suggest": metadata("Suggest or apply CRM tags", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "company.get": metadata("Show a linked company", READ_INTERNAL),
  "company.link": metadata("Link a company", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "company.unlink": metadata("Unlink a company", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "company.suggest": metadata("Suggest or apply a company", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "tasks.today": metadata("List tasks due today", READ_INTERNAL),
  "tasks.add": metadata("Add a follow-up task", WRITE_INTERNAL),
  "tasks.done": metadata("Complete a follow-up task", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "tasks.suggest": metadata("Suggest or apply follow-up tasks", WRITE_EXTERNAL),
  "summary.show": metadata("Show a chat summary", READ_INTERNAL),
  "summary.refresh": metadata("Refresh chat summaries", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "nudge.generate": metadata("Generate a follow-up message", WRITE_EXTERNAL),
  "rules.list": metadata("List automation rules", READ_INTERNAL),
  "rules.add": metadata("Add an automation rule", WRITE_INTERNAL),
  "rules.disable": metadata("Disable an automation rule", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "rules.delete": metadata("Delete an automation rule", {
    ...WRITE_INTERNAL,
    destructiveHint: true,
  }),
  "rules.run": metadata("Run automation rules", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "rules.dryRun": metadata(
    "Preview automation rule results",
    WRITE_EXTERNAL,
  ),
  "rules.log": metadata("List automation activity", READ_INTERNAL),
  "sync.backfill": metadata("Backfill the local Telegram database", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "sync.once": metadata("Sync recent Telegram chats", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
  "session.logout": metadata("Disconnect the local Telegram account", {
    ...WRITE_EXTERNAL,
    destructiveHint: true,
  }),
};

export function getMcpToolClientMetadata(toolName: string) {
  const clientMetadata = TOOL_METADATA[toolName];
  if (!clientMetadata) {
    throw new Error(`Missing MCP client metadata for ${toolName}.`);
  }
  return clientMetadata;
}
