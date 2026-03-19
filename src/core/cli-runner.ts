import { createContext, destroyContext } from "../app/context.js";
import { runArchive, runUnarchive } from "../commands/archive.js";
import { runAuth } from "../commands/auth.js";
import { runChat } from "../commands/chat.js";
import { runCompany } from "../commands/company.js";
import { runDb } from "../commands/db.js";
import { runExport } from "../commands/export.js";
import { runFolders } from "../commands/folders.js";
import { runImport } from "../commands/import.js";
import { runInbox } from "../commands/inbox.js";
import { runLogout } from "../commands/logout.js";
import { runNudge } from "../commands/nudge.js";
import { runOpen } from "../commands/open.js";
import { runRules } from "../commands/rules.js";
import { runSearch } from "../commands/search.js";
import { runSummary } from "../commands/summary.js";
import { runSync } from "../commands/sync.js";
import { runTags } from "../commands/tags.js";
import { runTasks } from "../commands/tasks.js";
import { runWhoami } from "../commands/whoami.js";
import { errorPayload, isJsonModeArgv, printJson } from "../output.js";

export const HELP = `Usage:
  tgchats inbox [--limit <number>] [--all]
  tgchats auth [status]
  tgchats whoami
  tgchats logout
  tgchats chat <peer> [--limit N] [--since messageId]
  tgchats open <peer>
  tgchats search "<query>" [--chat <peer>] [--tag <tag>] [--company <name>] [--limit N]
  tgchats folders <list|create|rename|delete|order|add|remove> ...
  tgchats archive <peer...>
  tgchats unarchive <peer...>
  tgchats tags <set|ls|suggest> ...
  tgchats company <link|show|suggest> ...
  tgchats tasks <add|done|today|suggest> ...
  tgchats summary <show|refresh> ...
  tgchats nudge <peer> [--style concise|friendly]
  tgchats rules <list|add|run|log> ...
  tgchats sync <backfill|once|tail> ...
  tgchats export --format <json|jsonl|csv|md> --out <path>
  tgchats import --from <path>
  tgchats db migrate

Environment:
  TELEGRAM_API_ID           Required Telegram app API ID
  TELEGRAM_API_HASH         Required Telegram app API hash
  TELEGRAM_SESSION_PATH     Optional session SQLite path
  TELEGRAM_PROXY_URL        Optional proxy URL:
                            http://host:port
                            https://host:port
                            socks4://host:port
                            socks5://host:port
  TELEGRAM_ACCOUNT_LABEL    Optional account label (default: "default")
  DATABASE_URL              Optional Postgres URL for app/CRM data
  AI_MODE                   Optional AI backend: gemini | openclaw
  GEMINI_API_KEY            Required when AI_MODE=gemini
  GEMINI_MODEL              Optional Gemini model (default: gemini-2.0-flash)
  OPENCLAW_BASE_URL         Required when AI_MODE=openclaw
  OPENCLAW_API_KEY          Optional bearer token for OpenClaw
  OPENCLAW_MODEL            Optional OpenClaw model (default: openclaw)
  AI_TIMEOUT_MS             Optional AI request timeout in milliseconds (default: 30000)

Flags:
  -n, --limit <number>      Number of chats to list (default: 5)
  -a, --all                 List all chats
  --json                    Machine-readable JSON output for supported commands
`;

export async function executeCli(argv: string[]): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    return;
  }

  const [maybeCmd, ...rest] = argv;
  const command = maybeCmd && !maybeCmd.startsWith("-") ? maybeCmd : "inbox";
  const args = command === "inbox" ? argv : rest;
  const ctx = createContext(args);

  try {
    if (command === "db") return await runDb(ctx, rest);
    if (command === "inbox") return await runInbox(ctx);
    if (command === "auth") return await runAuth(ctx, rest);
    if (command === "whoami") return await runWhoami(ctx);
    if (command === "logout") return await runLogout(ctx);
    if (command === "chat") return await runChat(ctx, rest);
    if (command === "open") return await runOpen(ctx, rest);
    if (command === "search") return await runSearch(ctx, rest);
    if (command === "folders") return await runFolders(ctx, rest);
    if (command === "archive") return await runArchive(ctx, rest);
    if (command === "unarchive") return await runUnarchive(ctx, rest);
    if (command === "tags") return await runTags(ctx, rest);
    if (command === "company") return await runCompany(ctx, rest);
    if (command === "tasks") return await runTasks(ctx, rest);
    if (command === "summary") return await runSummary(ctx, rest);
    if (command === "nudge") return await runNudge(ctx, rest);
    if (command === "rules") return await runRules(ctx, rest);
    if (command === "sync") return await runSync(ctx, rest);
    if (command === "export") return await runExport(ctx, rest);
    if (command === "import") return await runImport(ctx, rest);
    throw new Error(`Unknown command: ${command}`);
  } finally {
    await destroyContext(ctx);
  }
}

function stringifyConsoleArgs(args: unknown[]) {
  return args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
}

export async function executeCliJson(argv: string[]): Promise<unknown> {
  const jsonArgv = argv.includes("--json") ? argv : [...argv, "--json"];
  const capturedLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    capturedLogs.push(stringifyConsoleArgs(args));
  };
  console.error = (...args: unknown[]) => {
    capturedLogs.push(stringifyConsoleArgs(args));
  };

  try {
    await executeCli(jsonArgv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorPayload(message);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  const payload = capturedLogs.at(-1);
  if (!payload) {
    throw new Error("No JSON payload was produced by the command.");
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new Error(
      `Expected JSON output from command, received: ${payload}`
    );
  }
}

export async function runCliMain(argv: string[]): Promise<void> {
  try {
    await executeCli(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isJsonModeArgv(argv)) {
      printJson(errorPayload(message));
    } else {
      console.error(`Error: ${message}`);
    }
    process.exitCode = 1;
  }
}
