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

const NULLABLE_STRING_SCHEMA = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

const DIALOG_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["peer", "archived", "pinned", "unreadCount", "lastMessage"],
  properties: {
    peer: {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "displayName", "username"],
      properties: {
        id: { type: "string" },
        kind: { type: "string", enum: ["user", "chat", "channel", "self"] },
        displayName: { type: "string" },
        username: NULLABLE_STRING_SCHEMA,
      },
    },
    archived: { type: "boolean" },
    pinned: { type: "boolean" },
    unreadCount: { type: "integer", minimum: 0 },
    lastMessage: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["id", "date", "preview"],
          properties: {
            id: { type: "integer" },
            date: { type: "string", format: "date-time" },
            preview: { type: "string" },
          },
        },
      ],
    },
  },
} as const;

const SYNC_STATUS_VALUES = [
  "queued",
  "running",
  "waiting_for_telegram",
  "enriching",
  "complete",
  "failed",
] as const;

const SYNC_RUN_PROPERTIES = {
  runId: { type: "string" },
  status: { type: "string", enum: SYNC_STATUS_VALUES },
  mode: { type: "string", enum: ["recent", "full"] },
  includeArchived: { type: "boolean" },
  phase: {
    type: "string",
    enum: ["active", "archived", "contacts", "enrichment", "complete"],
  },
  fetchedCount: { type: "integer", minimum: 0 },
  persistedCount: { type: "integer", minimum: 0 },
  skippedCount: { type: "integer", minimum: 0 },
  failedCount: { type: "integer", minimum: 0 },
  resumeAt: NULLABLE_STRING_SCHEMA,
  lastErrorCode: NULLABLE_STRING_SCHEMA,
} as const;

function exactOutputSchema(
  required: string[],
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["ok", ...required],
    properties: {
      ok: { type: "boolean", const: true },
      ...properties,
    },
  };
}

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
  "inventory.summary": {
    title: "Summarize Telegram inventory",
    annotations: READ_EXTERNAL,
    outputSchema: exactOutputSchema(
      ["telegramDialogs", "chihoDialogs", "sync"],
      {
        telegramDialogs: {
          type: "object",
          additionalProperties: false,
          required: ["activeTotal", "archivedTotal", "allTotal", "measuredAt"],
          properties: {
            activeTotal: { type: "integer", minimum: 0 },
            archivedTotal: { type: "integer", minimum: 0 },
            allTotal: { type: "integer", minimum: 0 },
            measuredAt: { type: "string", format: "date-time" },
          },
        },
        chihoDialogs: {
          type: "object",
          additionalProperties: false,
          required: ["syncedTotal", "lastSyncedAt"],
          properties: {
            syncedTotal: {
              anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
            },
            lastSyncedAt: NULLABLE_STRING_SCHEMA,
          },
        },
        sync: {
          type: "object",
          additionalProperties: false,
          required: ["status", "runId"],
          properties: {
            status: {
              anyOf: [
                { type: "string", enum: SYNC_STATUS_VALUES },
                { type: "null" },
              ],
            },
            runId: NULLABLE_STRING_SCHEMA,
          },
        },
      },
    ),
  },
  "dialogs.list": {
    title: "List live Telegram chats",
    annotations: READ_EXTERNAL,
    outputSchema: exactOutputSchema(
      ["source", "location", "inventoryTotal", "hasMore", "nextCursor", "dialogs"],
      {
        source: { type: "string", const: "telegram" },
        location: { type: "string", enum: ["active", "archived", "all"] },
        inventoryTotal: { type: "integer", minimum: 0 },
        hasMore: { type: "boolean" },
        nextCursor: NULLABLE_STRING_SCHEMA,
        dialogs: { type: "array", items: DIALOG_ITEM_SCHEMA },
      },
    ),
  },
  "crm.dialogs.list": {
    title: "List synced CRM chats",
    annotations: READ_INTERNAL,
    outputSchema: exactOutputSchema(
      ["source", "syncedTotal", "lastSyncedAt", "hasMore", "nextCursor", "dialogs"],
      {
        source: { type: "string", const: "chiho-crm" },
        syncedTotal: { type: "integer", minimum: 0 },
        lastSyncedAt: NULLABLE_STRING_SCHEMA,
        hasMore: { type: "boolean" },
        nextCursor: NULLABLE_STRING_SCHEMA,
        dialogs: { type: "array", items: DIALOG_ITEM_SCHEMA },
      },
    ),
  },
  "contacts.count": {
    title: "Count Telegram contacts",
    annotations: READ_EXTERNAL,
    outputSchema: exactOutputSchema(
      ["source", "contactTotal", "fetchedAt"],
      {
        source: { type: "string", const: "telegram-contacts" },
        contactTotal: { type: "integer", minimum: 0 },
        fetchedAt: { type: "string", format: "date-time" },
      },
    ),
  },
  "contacts.list": {
    title: "List Telegram contacts",
    annotations: READ_EXTERNAL,
    outputSchema: exactOutputSchema(
      ["source", "contactTotal", "hasMore", "nextCursor", "contacts"],
      {
        source: { type: "string", const: "telegram-contacts" },
        contactTotal: { type: "integer", minimum: 0 },
        hasMore: { type: "boolean" },
        nextCursor: NULLABLE_STRING_SCHEMA,
        contacts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["peerId", "displayName", "username"],
            properties: {
              peerId: { type: "string" },
              displayName: { type: "string" },
              username: NULLABLE_STRING_SCHEMA,
            },
          },
        },
      },
    ),
  },
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
  "sync.once": {
    title: "Start or resume Telegram sync",
    annotations: { ...WRITE_EXTERNAL, destructiveHint: true, idempotentHint: true },
    outputSchema: exactOutputSchema(
      Object.keys(SYNC_RUN_PROPERTIES),
      SYNC_RUN_PROPERTIES,
    ),
  },
  "sync.status": {
    title: "Show Telegram sync status",
    annotations: READ_INTERNAL,
    outputSchema: exactOutputSchema(
      Object.keys(SYNC_RUN_PROPERTIES),
      SYNC_RUN_PROPERTIES,
    ),
  },
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
