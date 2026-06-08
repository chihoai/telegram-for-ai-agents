import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: node ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result.stdout;
}

function frameRequest(payload) {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function createMcpClient(command, args, { cwd = projectRoot } = {}) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["pipe", "pipe", "inherit"],
  });

  let buffer = "";
  const pending = [];

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        throw new Error(`Missing Content-Length header: ${header}`);
      }

      const contentLength = Number(match[1]);
      const frameEnd = headerEnd + 4 + contentLength;
      if (buffer.length < frameEnd) {
        return;
      }

      const body = buffer.slice(headerEnd + 4, frameEnd);
      buffer = buffer.slice(frameEnd);

      const resolver = pending.shift();
      if (!resolver) {
        throw new Error(`Unexpected MCP frame: ${body}`);
      }

      resolver(JSON.parse(body));
    }
  });

  function request(payload, { notify = false } = {}) {
    if (!notify) {
      const response = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for MCP response to ${payload.method}`));
        }, 5000);

        pending.push((value) => {
          clearTimeout(timeout);
          resolve(value);
        });
      });

      child.stdin.write(frameRequest(payload));
      return response;
    }

    child.stdin.write(frameRequest(payload));
    return Promise.resolve(null);
  }

  async function close() {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  return { close, request };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const cliPath = path.join(projectRoot, "dist", "cli.js");
const mcpPath = path.join(projectRoot, "dist", "mcp", "stdio.js");
const contractsPath = path.join(projectRoot, "docs", "tool-contracts.json");
const codexPluginManifestPath = path.join(projectRoot, ".codex-plugin", "plugin.json");
const codexPluginMcpPath = path.join(projectRoot, ".mcp.json");
const claudePluginManifestPath = path.join(projectRoot, ".claude-plugin", "plugin.json");
const claudePluginMcpPath = path.join(projectRoot, "claude-mcp.json");
const pluginEntrySkillPath = path.join(projectRoot, "skills", "telegram-for-agents", "SKILL.md");
const pluginMcpLauncherPath = path.join(projectRoot, "scripts", "run-tgchats-mcp.mjs");

assert(await fileExists(cliPath), `Missing CLI build output at ${cliPath}`);
assert(await fileExists(mcpPath), `Missing MCP build output at ${mcpPath}`);
assert(await fileExists(contractsPath), `Missing contract export at ${contractsPath}`);
assert(
  await fileExists(codexPluginManifestPath),
  `Missing Codex plugin manifest at ${codexPluginManifestPath}`
);
assert(await fileExists(codexPluginMcpPath), `Missing Codex plugin MCP config at ${codexPluginMcpPath}`);
assert(
  await fileExists(claudePluginManifestPath),
  `Missing Claude plugin manifest at ${claudePluginManifestPath}`
);
assert(
  await fileExists(claudePluginMcpPath),
  `Missing Claude plugin MCP config at ${claudePluginMcpPath}`
);
assert(
  await fileExists(pluginEntrySkillPath),
  `Missing Codex plugin entry skill at ${pluginEntrySkillPath}`
);
assert(
  await fileExists(pluginMcpLauncherPath),
  `Missing Codex plugin MCP launcher at ${pluginMcpLauncherPath}`
);

const codexPluginManifest = JSON.parse(await fs.readFile(codexPluginManifestPath, "utf8"));
assert(codexPluginManifest.name === "chiho-telegram", "Codex plugin manifest name changed unexpectedly");
assert(codexPluginManifest.skills === "./skills/", "Codex plugin manifest must point at ./skills/");
assert(codexPluginManifest.mcpServers === "./.mcp.json", "Codex plugin manifest must point at ./.mcp.json");

const codexPluginMcp = JSON.parse(await fs.readFile(codexPluginMcpPath, "utf8"));
const codexTgchatsMcp = codexPluginMcp?.mcpServers?.["tgchats-local"];
assert(codexTgchatsMcp?.command === "node", "Codex plugin MCP command must use node");
assert(
  Array.isArray(codexTgchatsMcp?.args) &&
    codexTgchatsMcp.args.length === 1 &&
    codexTgchatsMcp.args[0] === "./scripts/run-tgchats-mcp.mjs",
  "Codex plugin MCP args must launch scripts/run-tgchats-mcp.mjs"
);
assert(codexTgchatsMcp.cwd === ".", "Codex plugin MCP cwd must be plugin root");

const claudePluginManifest = JSON.parse(await fs.readFile(claudePluginManifestPath, "utf8"));
assert(claudePluginManifest.name === "chiho-telegram", "Claude plugin manifest name changed unexpectedly");
assert(
  claudePluginManifest.mcpServers === "./claude-mcp.json",
  "Claude plugin manifest must point at ./claude-mcp.json"
);

const claudePluginMcp = JSON.parse(await fs.readFile(claudePluginMcpPath, "utf8"));
const claudeTgchatsMcp = claudePluginMcp?.mcpServers?.["tgchats-local"];
assert(claudeTgchatsMcp?.command === "node", "Claude plugin MCP command must use node");
assert(
  Array.isArray(claudeTgchatsMcp?.args) &&
    claudeTgchatsMcp.args.length === 1 &&
    claudeTgchatsMcp.args[0] === "${CLAUDE_PLUGIN_ROOT}/scripts/run-tgchats-mcp.mjs",
  "Claude plugin MCP args must launch scripts/run-tgchats-mcp.mjs through CLAUDE_PLUGIN_ROOT"
);
assert(
  claudeTgchatsMcp.cwd === "${CLAUDE_PLUGIN_ROOT}",
  "Claude plugin MCP cwd must use CLAUDE_PLUGIN_ROOT"
);

const helpOutput = runNode([cliPath, "--help"]);
assert(helpOutput.includes("tgchats"), "CLI help output did not mention tgchats");

const authStatusOutput = runNode([cliPath, "auth", "status", "--json"]).trim();
const authStatus = JSON.parse(authStatusOutput);
assert(authStatus.ok === true, "auth status JSON did not report ok: true");
assert(
  typeof authStatus.sessionPresent === "boolean",
  "auth status JSON did not include sessionPresent"
);

if (authStatus.sessionPresent) {
  const whoamiOutput = runNode([cliPath, "whoami", "--json"]).trim();
  const whoami = JSON.parse(whoamiOutput);
  assert(whoami.ok === true, "whoami JSON did not report ok: true");
  assert(typeof whoami.account?.id === "number", "whoami JSON did not include account id");

  const smokePeer = process.env.TGCHATS_SMOKE_PEER?.trim();
  if (smokePeer) {
    const openOutput = runNode([cliPath, "open", smokePeer, "--json"]).trim();
    const openPayload = JSON.parse(openOutput);
    assert(openPayload.ok === true, "open JSON did not report ok: true");
    assert(String(openPayload.peer?.id) === smokePeer, "open JSON did not target the requested peer");
  }

  if (process.env.DATABASE_URL) {
    const tasksOutput = runNode([cliPath, "tasks", "today", "--json"]).trim();
    const tasksPayload = JSON.parse(tasksOutput);
    assert(tasksPayload.ok === true, "tasks today JSON did not report ok: true");
    assert(Array.isArray(tasksPayload.tasks), "tasks today JSON did not include tasks array");
  }
}

const contracts = JSON.parse(await fs.readFile(contractsPath, "utf8"));
const mcpClient = createMcpClient(process.execPath, [mcpPath]);
const pluginMcpClient = createMcpClient(process.execPath, [pluginMcpLauncherPath]);
const claudeMcpArgs = claudeTgchatsMcp.args.map((arg) =>
  arg.replaceAll("${CLAUDE_PLUGIN_ROOT}", projectRoot)
);
const claudeMcpCwd = claudeTgchatsMcp.cwd.replaceAll("${CLAUDE_PLUGIN_ROOT}", projectRoot);
const claudePluginMcpClient = createMcpClient(claudeTgchatsMcp.command, claudeMcpArgs, {
  cwd: claudeMcpCwd,
});

try {
  const initialize = await mcpClient.request({
    id: 1,
    jsonrpc: "2.0",
    method: "initialize",
    params: {},
  });
  assert(
    initialize?.result?.serverInfo?.name === "tgchats-local",
    "initialize response did not return the tgchats local MCP server"
  );

  await mcpClient.request(
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    { notify: true }
  );

  const toolsList = await mcpClient.request({
    id: 2,
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
  });
  const toolNames = toolsList?.result?.tools?.map((tool) => tool.name) || [];
  const contractNames = contracts.map((tool) => tool.name);

  assert(toolNames.length === contractNames.length, "MCP tool count did not match contract count");
  assert(
    JSON.stringify(toolNames) === JSON.stringify(contractNames),
    "MCP tool order or names did not match docs/tool-contracts.json"
  );

  const pluginInitialize = await pluginMcpClient.request({
    id: 3,
    jsonrpc: "2.0",
    method: "initialize",
    params: {},
  });
  assert(
    pluginInitialize?.result?.serverInfo?.name === "tgchats-local",
    "plugin MCP launcher did not initialize the tgchats local MCP server"
  );
  const pluginToolsList = await pluginMcpClient.request({
    id: 4,
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
  });
  const pluginToolNames = pluginToolsList?.result?.tools?.map((tool) => tool.name) || [];
  assert(
    JSON.stringify(pluginToolNames) === JSON.stringify(contractNames),
    "plugin MCP launcher tool order or names did not match docs/tool-contracts.json"
  );

  const claudePluginInitialize = await claudePluginMcpClient.request({
    id: 5,
    jsonrpc: "2.0",
    method: "initialize",
    params: {},
  });
  assert(
    claudePluginInitialize?.result?.serverInfo?.name === "tgchats-local",
    "Claude plugin MCP config did not initialize the tgchats local MCP server"
  );
  const claudePluginToolsList = await claudePluginMcpClient.request({
    id: 6,
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
  });
  const claudePluginToolNames =
    claudePluginToolsList?.result?.tools?.map((tool) => tool.name) || [];
  assert(
    JSON.stringify(claudePluginToolNames) === JSON.stringify(contractNames),
    "Claude plugin MCP config tool order or names did not match docs/tool-contracts.json"
  );

  console.log(
    JSON.stringify(
      {
        checked: {
          authStatus,
          cliHelp: true,
          codexPlugin: codexPluginManifest.name,
          claudePlugin: claudePluginManifest.name,
          contracts: contractNames.length,
          mcpInitialize: initialize.result.serverInfo,
          pluginMcpInitialize: pluginInitialize.result.serverInfo,
          claudePluginMcpInitialize: claudePluginInitialize.result.serverInfo,
          mcpTools: toolNames.length,
          pluginMcpTools: pluginToolNames.length,
          claudePluginMcpTools: claudePluginToolNames.length,
        },
        ok: true,
      },
      null,
      2
    )
  );
} finally {
  await mcpClient.close();
  await pluginMcpClient.close();
  await claudePluginMcpClient.close();
}
