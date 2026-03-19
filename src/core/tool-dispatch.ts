import { getToolContractDefinitions } from "../contracts/tool-contracts.js";
import { executeCliJson } from "./cli-runner.js";

function integerFlag(value: unknown, flag: string) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }

  return [flag, String(parsed)];
}

function stringFlag(value: unknown, flag: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  return [flag, value.trim()];
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function requireStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} is required.`);
  }

  const values = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (typeof item === "number" && Number.isFinite(item)) {
        return String(item);
      }
      return "";
    })
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return values;
}

export function buildToolCommandArgs(
  toolName: string,
  input: Record<string, unknown> = {}
) {
  if (toolName === "auth.status") {
    return ["auth", "status"];
  }

  if (toolName === "account.whoami") {
    return ["whoami"];
  }

  if (toolName === "dialogs.list") {
    return [
      "inbox",
      ...integerFlag(input.limit, "--limit"),
      ...(input.all ? ["--all"] : []),
    ];
  }

  if (toolName === "chat.read") {
    return [
      "chat",
      requireString(input.peer, "peer"),
      ...integerFlag(input.limit, "--limit"),
      ...integerFlag(input.sinceMessageId, "--since"),
    ];
  }

  if (toolName === "search.messages") {
    return [
      "search",
      requireString(input.query, "query"),
      ...stringFlag(input.chat, "--chat"),
      ...stringFlag(input.tag, "--tag"),
      ...stringFlag(input.company, "--company"),
      ...integerFlag(input.limit, "--limit"),
      ...(input.local ? ["--local"] : []),
    ];
  }

  if (toolName === "folders.list") {
    return ["folders", "list"];
  }

  if (toolName === "folders.update") {
    const action = requireString(input.action, "action");
    if (action === "create") {
      return ["folders", "create", "--title", requireString(input.title, "title")];
    }
    if (action === "rename") {
      return [
        "folders",
        "rename",
        requireString(input.folder, "folder"),
        "--title",
        requireString(input.title, "title"),
      ];
    }
    if (action === "delete") {
      return ["folders", "delete", requireString(input.folder, "folder")];
    }
    if (action === "order") {
      return [
        "folders",
        "order",
        ...requireStringArray(input.folderIds, "folderIds"),
      ];
    }
    if (action === "add" || action === "remove") {
      return [
        "folders",
        action,
        requireString(input.folder, "folder"),
        ...requireStringArray(input.peers, "peers"),
      ];
    }
    throw new Error("Unsupported folders.update action.");
  }

  if (toolName === "tags.get") {
    return ["tags", "ls", ...stringFlag(input.peer, "--peer")];
  }

  if (toolName === "tags.set") {
    return [
      "tags",
      "set",
      requireString(input.peer, "peer"),
      ...requireStringArray(input.tags, "tags"),
    ];
  }

  if (toolName === "tags.suggest") {
    return [
      "tags",
      "suggest",
      requireString(input.peer, "peer"),
      ...integerFlag(input.limit, "--limit"),
      ...(input.apply ? ["--apply"] : []),
    ];
  }

  if (toolName === "company.get") {
    return ["company", "show", requireString(input.peer, "peer")];
  }

  if (toolName === "company.link") {
    return [
      "company",
      "link",
      requireString(input.peer, "peer"),
      "--company",
      requireString(input.company, "company"),
      ...stringFlag(input.role, "--role"),
    ];
  }

  if (toolName === "company.suggest") {
    return [
      "company",
      "suggest",
      requireString(input.peer, "peer"),
      ...integerFlag(input.limit, "--limit"),
      ...(input.apply ? ["--apply"] : []),
    ];
  }

  if (toolName === "tasks.today") {
    return ["tasks", "today"];
  }

  if (toolName === "tasks.add") {
    return [
      "tasks",
      "add",
      requireString(input.peer, "peer"),
      "--due",
      requireString(input.due, "due"),
      "--why",
      requireString(input.why, "why"),
      ...stringFlag(input.priority, "--priority"),
    ];
  }

  if (toolName === "tasks.done") {
    return ["tasks", "done", ...integerFlag(input.taskId, "--task-id").slice(1)];
  }

  if (toolName === "tasks.suggest") {
    return [
      "tasks",
      "suggest",
      requireString(input.peer, "peer"),
      ...integerFlag(input.limit, "--limit"),
      ...(input.apply ? ["--apply"] : []),
    ];
  }

  if (toolName === "summary.show") {
    return [
      "summary",
      "show",
      requireString(input.peer, "peer"),
      ...stringFlag(input.kind, "--kind"),
    ];
  }

  if (toolName === "summary.refresh") {
    if (input.all) {
      return [
        "summary",
        "refresh",
        "--all",
        ...integerFlag(input.limit, "--limit"),
      ];
    }

    return [
      "summary",
      "refresh",
      requireString(input.peer, "peer"),
      ...integerFlag(input.limit, "--limit"),
    ];
  }

  if (toolName === "nudge.generate") {
    return [
      "nudge",
      requireString(input.peer, "peer"),
      ...stringFlag(input.style, "--style"),
    ];
  }

  if (toolName === "rules.list") {
    return ["rules", "list"];
  }

  if (toolName === "rules.add") {
    return [
      "rules",
      "add",
      "--name",
      requireString(input.name, "name"),
      "--instruction",
      requireString(input.instruction, "instruction"),
      ...stringFlag(input.tag, "--tag"),
      ...integerFlag(input.followupDays, "--followup-days"),
    ];
  }

  if (toolName === "rules.run") {
    return ["rules", "run"];
  }

  if (toolName === "rules.log") {
    return ["rules", "log", ...integerFlag(input.limit, "--limit")];
  }

  if (toolName === "sync.backfill") {
    return [
      "sync",
      "backfill",
      ...integerFlag(input.perChatLimit, "--per-chat-limit"),
      ...integerFlag(input.dialogs, "--dialogs"),
    ];
  }

  if (toolName === "sync.once") {
    return ["sync", "once", ...integerFlag(input.dialogs, "--dialogs")];
  }

  if (toolName === "session.logout") {
    return ["logout"];
  }

  throw new Error(`Unsupported tool: ${toolName}`);
}

export async function executeLocalToolCall(
  toolName: string,
  input: Record<string, unknown> = {}
) {
  const supported = new Set(getToolContractDefinitions().map((tool) => tool.name));
  if (!supported.has(toolName)) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return executeCliJson(buildToolCommandArgs(toolName, input));
}
