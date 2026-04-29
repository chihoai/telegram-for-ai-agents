export interface ToolContractDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  transport: "shared" | "local";
}

export const TOOL_CONTRACT_DEFINITIONS: ToolContractDefinition[] = [
  {
    name: "auth.status",
    description: "Check whether a local Telegram session file exists.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "account.whoami",
    description: "Return the currently logged-in Telegram account.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "dialogs.list",
    description: "List recent Telegram dialogs.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        all: { type: "boolean" },
      },
    },
  },
  {
    name: "chat.read",
    description: "Read recent history for a Telegram peer.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        accountId: { type: "string" },
        peer: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        sinceMessageId: { type: "integer", minimum: 1 },
        offsetDate: { type: "integer" },
        peerRef: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            kind: {
              type: "string",
              enum: ["user", "chat", "channel", "self"],
            },
            accessHash: { type: "string" },
          },
        },
      },
    },
  },
  {
    name: "search.messages",
    description: "Search Telegram or local CRM messages.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        chat: { type: "string" },
        tag: { type: "string" },
        company: { type: "string" },
        local: { type: "boolean" },
      },
    },
  },
  {
    name: "folders.list",
    description: "List editable Telegram folders.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
      },
    },
  },
  {
    name: "folders.update",
    description: "Mutate Telegram folders using one explicit action at a time.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["action"],
      properties: {
        action: {
          type: "string",
          enum: ["create", "rename", "delete", "order", "add", "remove"],
        },
        folder: { type: "string" },
        title: { type: "string" },
        folderIds: {
          type: "array",
          items: { type: "integer" },
        },
        peers: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "folders.create",
    description: "Create a Telegram folder containing one peer.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "peer"],
      properties: {
        accountId: { type: "string" },
        title: { type: "string" },
        peer: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "folders.addDialog",
    description: "Add one dialog to a Telegram folder.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["folderId", "peer"],
      properties: {
        accountId: { type: "string" },
        folderId: { type: "string" },
        peer: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "folders.removeDialog",
    description: "Remove one dialog from a Telegram folder.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["folderId", "peer"],
      properties: {
        accountId: { type: "string" },
        folderId: { type: "string" },
        peer: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "outbox.preview",
    description: "Preview a Telegram outbox batch without sending.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        peers: { type: "array", maxItems: 20, items: { type: "string" } },
        text: { type: "string" },
        template: {
          type: "object",
          additionalProperties: true,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            text: { type: "string" },
          },
        },
        templateId: { type: "string" },
        schedule: { oneOf: [{ type: "string" }, { type: "number" }] },
      },
    },
  },
  {
    name: "outbox.sendApproved",
    description: "Execute an approved Telegram outbox preview.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["previewId"],
      properties: {
        previewId: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "message.sendDraft",
    description: "Send one Telegram message draft to one peer.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer", "text"],
      properties: {
        accountId: { type: "string" },
        peer: { type: "string" },
        text: { type: "string" },
        schedule: { oneOf: [{ type: "string" }, { type: "number" }] },
        clientProvidedDraftId: { type: "string" },
      },
    },
  },
  {
    name: "members.invitePreview",
    description: "Preview adding or inviting a Telegram user to group chats.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["userId", "groups"],
      properties: {
        accountId: { type: "string" },
        userId: { type: "string" },
        userAccessHash: { type: "string" },
        groups: {
          type: "array",
          maxItems: 20,
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  peerId: { type: "string" },
                  groupId: { type: "string" },
                },
              },
            ],
          },
        },
      },
    },
  },
  {
    name: "members.inviteApproved",
    description: "Execute an approved Telegram member invite preview.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["previewId"],
      properties: {
        previewId: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "groups.leavePreview",
    description: "Preview leaving Telegram groups.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["groups"],
      properties: {
        accountId: { type: "string" },
        groups: {
          type: "array",
          maxItems: 20,
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "string" },
                  peerId: { type: "string" },
                  groupId: { type: "string" },
                },
              },
            ],
          },
        },
        clear: { type: "boolean" },
      },
    },
  },
  {
    name: "groups.leaveApproved",
    description: "Execute an approved Telegram group leave preview.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["previewId"],
      properties: {
        previewId: { type: "string" },
        idempotencyKey: { type: "string" },
      },
    },
  },
  {
    name: "tags.get",
    description: "List tags, optionally filtered to a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        peer: { type: "string" },
      },
    },
  },
  {
    name: "tags.set",
    description: "Set manual tags for a Telegram peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer", "tags"],
      properties: {
        peer: { type: "string" },
        tags: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "tags.suggest",
    description: "Generate or apply AI tag suggestions for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        apply: { type: "boolean" },
      },
    },
  },
  {
    name: "company.get",
    description: "Show linked company metadata for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
      },
    },
  },
  {
    name: "company.link",
    description: "Link a peer to a company record.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer", "company"],
      properties: {
        peer: { type: "string" },
        company: { type: "string" },
        role: { type: "string" },
      },
    },
  },
  {
    name: "company.suggest",
    description: "Generate or apply an AI company suggestion for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        apply: { type: "boolean" },
      },
    },
  },
  {
    name: "tasks.today",
    description: "List follow-up tasks due today.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "tasks.add",
    description: "Add a follow-up task for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer", "due", "why"],
      properties: {
        peer: { type: "string" },
        due: { type: "string" },
        why: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "med", "high"],
        },
      },
    },
  },
  {
    name: "tasks.done",
    description: "Mark a task as completed.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["taskId"],
      properties: {
        taskId: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "tasks.suggest",
    description: "Generate or apply AI task suggestions for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        apply: { type: "boolean" },
      },
    },
  },
  {
    name: "summary.show",
    description: "Show the stored summary for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
        kind: {
          type: "string",
          enum: ["rolling", "since_last_seen"],
        },
      },
    },
  },
  {
    name: "summary.refresh",
    description: "Generate or refresh summaries.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        peer: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
        all: { type: "boolean" },
      },
    },
  },
  {
    name: "nudge.generate",
    description: "Generate a suggested follow-up nudge for a peer.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["peer"],
      properties: {
        peer: { type: "string" },
        style: {
          type: "string",
          enum: ["concise", "friendly"],
        },
      },
    },
  },
  {
    name: "rules.list",
    description: "List CRM automation rules.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "rules.add",
    description: "Add a CRM automation rule.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "instruction"],
      properties: {
        name: { type: "string" },
        instruction: { type: "string" },
        tag: { type: "string" },
        followupDays: { type: "integer", minimum: 1 },
      },
    },
  },
  {
    name: "rules.run",
    description: "Execute enabled CRM automation rules.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "rules.dryRun",
    description: "Evaluate enabled CRM automation rules without writing actions or events.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "rules.log",
    description: "List recent rule events.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: "sync.backfill",
    description: "Backfill Telegram dialogs and history into the local CRM database.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        dialogs: { type: "integer", minimum: 1, maximum: 1000 },
        perChatLimit: { type: "integer", minimum: 1, maximum: 1000 },
      },
    },
  },
  {
    name: "sync.once",
    description: "Perform a one-shot sync of latest dialog state.",
    transport: "local",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        dialogs: { type: "integer", minimum: 1, maximum: 1000 },
      },
    },
  },
  {
    name: "session.logout",
    description: "Log out the current Telegram session.",
    transport: "shared",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
      },
    },
  },
];

export function getToolContractDefinitions(
  transport?: ToolContractDefinition["transport"]
) {
  if (!transport) {
    return TOOL_CONTRACT_DEFINITIONS;
  }

  return TOOL_CONTRACT_DEFINITIONS.filter((tool) => tool.transport === transport);
}
