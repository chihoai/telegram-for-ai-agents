import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
      `Command failed: node ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result.stdout;
}

async function createMcpClient(command, args, { cwd = projectRoot } = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry) => typeof entry[1] === "string"),
  );
  const transport = new StdioClientTransport({
    command,
    args,
    cwd,
    env,
    stderr: "inherit",
  });
  const client = new Client({
    name: "tgchats-local-install-check",
    version: "1.0.0",
  });
  await client.connect(transport, { timeout: 5_000 });
  return {
    client,
    close: () => client.close(),
    serverInfo: client.getServerVersion(),
  };
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
const hostedPluginRoot = path.join(projectRoot, "plugins", "chiho-telegram");
const localPluginRoot = path.join(projectRoot, "plugins", "tgchats-local");
const codexMarketplacePath = path.join(
  projectRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);
const claudeMarketplacePath = path.join(
  projectRoot,
  ".claude-plugin",
  "marketplace.json",
);
const hostedCodexManifestPath = path.join(
  hostedPluginRoot,
  ".codex-plugin",
  "plugin.json",
);
const hostedCodexMcpPath = path.join(hostedPluginRoot, ".mcp.json");
const hostedClaudeManifestPath = path.join(
  hostedPluginRoot,
  ".claude-plugin",
  "plugin.json",
);
const hostedClaudeMcpPath = path.join(hostedPluginRoot, "claude-mcp.json");
const localCodexManifestPath = path.join(
  localPluginRoot,
  ".codex-plugin",
  "plugin.json",
);
const localCodexMcpPath = path.join(localPluginRoot, ".mcp.json");
const localClaudeManifestPath = path.join(
  localPluginRoot,
  ".claude-plugin",
  "plugin.json",
);
const localClaudeMcpPath = path.join(localPluginRoot, "claude-mcp.json");
const hostedSkillPath = path.join(
  hostedPluginRoot,
  "skills",
  "chiho-telegram",
  "SKILL.md",
);
const localSkillPath = path.join(
  localPluginRoot,
  "skills",
  "tgchats-local",
  "SKILL.md",
);
const pluginMcpLauncherPath = path.join(
  localPluginRoot,
  "scripts",
  "run-tgchats-mcp.mjs",
);

assert(await fileExists(cliPath), `Missing CLI build output at ${cliPath}`);
assert(await fileExists(mcpPath), `Missing MCP build output at ${mcpPath}`);
assert(
  await fileExists(contractsPath),
  `Missing contract export at ${contractsPath}`,
);
for (const removedLegacyPath of [
  path.join(projectRoot, ".codex-plugin", "plugin.json"),
  path.join(projectRoot, ".claude-plugin", "plugin.json"),
  path.join(projectRoot, ".mcp.json"),
  path.join(projectRoot, "claude-mcp.json"),
]) {
  assert(
    !(await fileExists(removedLegacyPath)),
    `Legacy combined plugin surface must stay removed: ${removedLegacyPath}`,
  );
}
for (const requiredPath of [
  codexMarketplacePath,
  claudeMarketplacePath,
  hostedCodexManifestPath,
  hostedCodexMcpPath,
  hostedClaudeManifestPath,
  hostedClaudeMcpPath,
  localCodexManifestPath,
  localCodexMcpPath,
  localClaudeManifestPath,
  localClaudeMcpPath,
  hostedSkillPath,
  localSkillPath,
]) {
  assert(
    await fileExists(requiredPath),
    `Missing package file at ${requiredPath}`,
  );
}
assert(
  await fileExists(pluginMcpLauncherPath),
  `Missing local plugin MCP launcher at ${pluginMcpLauncherPath}`,
);

const codexMarketplace = JSON.parse(
  await fs.readFile(codexMarketplacePath, "utf8"),
);
const claudeMarketplace = JSON.parse(
  await fs.readFile(claudeMarketplacePath, "utf8"),
);
for (const marketplace of [codexMarketplace, claudeMarketplace]) {
  assert(marketplace.name === "chiho", "Marketplace name must be chiho");
  assert(
    JSON.stringify(marketplace.plugins.map((entry) => entry.name)) ===
      JSON.stringify(["chiho-telegram", "tgchats-local"]),
    "Marketplace must expose exactly the hosted and local packages",
  );
}

const hostedCodexManifest = JSON.parse(
  await fs.readFile(hostedCodexManifestPath, "utf8"),
);
const hostedCodexMcp = JSON.parse(
  await fs.readFile(hostedCodexMcpPath, "utf8"),
);
const localCodexManifest = JSON.parse(
  await fs.readFile(localCodexManifestPath, "utf8"),
);
const localCodexMcp = JSON.parse(await fs.readFile(localCodexMcpPath, "utf8"));

assert(
  hostedCodexManifest.name === "chiho-telegram",
  "Hosted Codex package name changed",
);
assert(
  localCodexManifest.name === "tgchats-local",
  "Local Codex package name changed",
);
assert(
  hostedCodexManifest.mcpServers === "./.mcp.json",
  "Hosted Codex manifest MCP path changed",
);
assert(
  localCodexManifest.mcpServers === "./.mcp.json",
  "Local Codex manifest MCP path changed",
);

const hostedCodexServer = hostedCodexMcp?.mcpServers?.["chiho-cloud"];
assert(
  hostedCodexServer?.url === "https://api.chiho.ai/mcp",
  "Hosted Codex package must use the canonical MCP URL",
);
assert(
  hostedCodexServer?.auth === "oauth",
  "Hosted Codex package must use OAuth",
);
assert(
  hostedCodexServer?.default_tools_approval_mode === "writes",
  "Hosted Codex package must prompt for non-read-only tools",
);
assert(
  !hostedCodexServer?.command && !hostedCodexServer?.bearer_token_env_var,
  "Hosted Codex package must not configure local commands or bearer tokens",
);
assert(
  !JSON.stringify(hostedCodexMcp).includes("chihocool.chiho.ai"),
  "Hosted Codex package must not use the legacy domain",
);

const localCodexServer = localCodexMcp?.mcpServers?.["tgchats-local"];
assert(
  localCodexServer?.command === "node",
  "Local Codex MCP command must use node",
);
assert(
  Array.isArray(localCodexServer?.args) &&
    localCodexServer.args.length === 1 &&
    localCodexServer.args[0] === "./scripts/run-tgchats-mcp.mjs",
  "Local Codex MCP args must launch scripts/run-tgchats-mcp.mjs",
);
assert(localCodexServer.cwd === ".", "Local Codex MCP cwd must be plugin root");

const hostedClaudeManifest = JSON.parse(
  await fs.readFile(hostedClaudeManifestPath, "utf8"),
);
const hostedClaudeMcp = JSON.parse(
  await fs.readFile(hostedClaudeMcpPath, "utf8"),
);
const localClaudeManifest = JSON.parse(
  await fs.readFile(localClaudeManifestPath, "utf8"),
);
const localClaudeMcp = JSON.parse(
  await fs.readFile(localClaudeMcpPath, "utf8"),
);

assert(
  hostedClaudeManifest.name === "chiho-telegram",
  "Hosted Claude package name changed",
);
assert(
  localClaudeManifest.name === "tgchats-local",
  "Local Claude package name changed",
);
assert(
  hostedClaudeManifest.mcpServers === "./claude-mcp.json" &&
    localClaudeManifest.mcpServers === "./claude-mcp.json",
  "Claude plugin manifests must point at ./claude-mcp.json",
);

const hostedClaudeServer = hostedClaudeMcp?.mcpServers?.["chiho-cloud"];
assert(
  hostedClaudeServer?.type === "http",
  "Hosted Claude MCP transport must be HTTP",
);
assert(
  hostedClaudeServer?.url === "https://api.chiho.ai/mcp",
  "Hosted Claude package must use the canonical MCP URL",
);
assert(
  !hostedClaudeServer?.headers && !hostedClaudeServer?.command,
  "Hosted Claude package must rely on OAuth discovery",
);
assert(
  !JSON.stringify(hostedClaudeMcp).includes("chihocool.chiho.ai"),
  "Hosted Claude package must not use the legacy domain",
);

const localClaudeServer = localClaudeMcp?.mcpServers?.["tgchats-local"];
assert(
  localClaudeServer?.command === "node",
  "Local Claude MCP command must use node",
);
assert(
  Array.isArray(localClaudeServer?.args) &&
    localClaudeServer.args.length === 1 &&
    localClaudeServer.args[0] ===
      "${CLAUDE_PLUGIN_ROOT}/scripts/run-tgchats-mcp.mjs",
  "Local Claude MCP args must launch through CLAUDE_PLUGIN_ROOT",
);
assert(
  localClaudeServer.cwd === "${CLAUDE_PLUGIN_ROOT}",
  "Local Claude MCP cwd must use CLAUDE_PLUGIN_ROOT",
);
assert(
  !JSON.stringify(localCodexMcp).includes("api.chiho.ai") &&
    !JSON.stringify(localClaudeMcp).includes("api.chiho.ai"),
  "Local packages must not configure the hosted Chiho MCP server",
);

const helpOutput = runNode([cliPath, "--help"]);
assert(
  helpOutput.includes("tgchats"),
  "CLI help output did not mention tgchats",
);

const authStatusOutput = runNode([cliPath, "auth", "status", "--json"]).trim();
const authStatus = JSON.parse(authStatusOutput);
assert(authStatus.ok === true, "auth status JSON did not report ok: true");
assert(
  typeof authStatus.sessionPresent === "boolean",
  "auth status JSON did not include sessionPresent",
);
assert(
  authStatus.sessionPath === undefined,
  "auth status JSON must not disclose the Telegram session path",
);

if (authStatus.sessionPresent) {
  const whoamiOutput = runNode([cliPath, "whoami", "--json"]).trim();
  const whoami = JSON.parse(whoamiOutput);
  assert(whoami.ok === true, "whoami JSON did not report ok: true");
  assert(
    typeof whoami.account?.id === "number",
    "whoami JSON did not include account id",
  );
  assert(
    whoami.sessionPath === undefined,
    "whoami JSON must not disclose the Telegram session path",
  );

  const smokePeer = process.env.TGCHATS_SMOKE_PEER?.trim();
  if (smokePeer) {
    const openOutput = runNode([cliPath, "open", smokePeer, "--json"]).trim();
    const openPayload = JSON.parse(openOutput);
    assert(openPayload.ok === true, "open JSON did not report ok: true");
    assert(
      String(openPayload.peer?.id) === smokePeer,
      "open JSON did not target the requested peer",
    );
  }

  if (process.env.DATABASE_URL) {
    const tasksOutput = runNode([cliPath, "tasks", "today", "--json"]).trim();
    const tasksPayload = JSON.parse(tasksOutput);
    assert(
      tasksPayload.ok === true,
      "tasks today JSON did not report ok: true",
    );
    assert(
      Array.isArray(tasksPayload.tasks),
      "tasks today JSON did not include tasks array",
    );
  }
}

const contracts = JSON.parse(await fs.readFile(contractsPath, "utf8"));
const claudeMcpArgs = localClaudeServer.args.map((arg) =>
  arg.replaceAll("${CLAUDE_PLUGIN_ROOT}", localPluginRoot),
);
const claudeMcpCwd = localClaudeServer.cwd.replaceAll(
  "${CLAUDE_PLUGIN_ROOT}",
  localPluginRoot,
);
const connections = [];

try {
  const mcpConnection = await createMcpClient(process.execPath, [mcpPath]);
  connections.push(mcpConnection);
  assert(
    mcpConnection.serverInfo?.name === "tgchats-local",
    "initialize response did not return the tgchats local MCP server",
  );

  const toolsList = await mcpConnection.client.listTools(
    {},
    { timeout: 5_000 },
  );
  const toolNames = toolsList.tools.map((tool) => tool.name);
  const contractNames = contracts.map((tool) => tool.name);

  assert(
    toolNames.length === contractNames.length,
    "MCP tool count did not match contract count",
  );
  assert(
    JSON.stringify(toolNames) === JSON.stringify(contractNames),
    "MCP tool order or names did not match docs/tool-contracts.json",
  );
  for (const [index, listedTool] of toolsList.tools.entries()) {
    const contract = contracts[index];
    for (const field of [
      "name",
      "title",
      "description",
      "inputSchema",
      "outputSchema",
      "annotations",
    ]) {
      assert(
        isDeepStrictEqual(listedTool[field], contract[field]),
        `MCP tool ${listedTool.name} ${field} did not match the exported contract`,
      );
    }
  }

  const authResult = await mcpConnection.client.callTool(
    { name: "auth.status", arguments: {} },
    undefined,
    { timeout: 5_000 },
  );
  assert(authResult.isError !== true, "auth.status returned an MCP error");
  assert(
    authResult.structuredContent?.sessionPath === undefined,
    "auth.status disclosed the Telegram session path",
  );

  const invalidCall = await mcpConnection.client.callTool(
    { name: "chat.read", arguments: {} },
    undefined,
    { timeout: 5_000 },
  );
  assert(
    invalidCall.isError === true,
    "failed local commands must return an MCP tool error",
  );
  assert(
    invalidCall.structuredContent === undefined,
    "MCP tool errors must not claim success-schema structured content",
  );

  const pluginConnection = await createMcpClient(process.execPath, [
    pluginMcpLauncherPath,
  ]);
  connections.push(pluginConnection);
  assert(
    pluginConnection.serverInfo?.name === "tgchats-local",
    "plugin MCP launcher did not initialize the tgchats local MCP server",
  );
  const pluginToolsList = await pluginConnection.client.listTools(
    {},
    { timeout: 5_000 },
  );
  const pluginToolNames = pluginToolsList.tools.map((tool) => tool.name);
  assert(
    JSON.stringify(pluginToolNames) === JSON.stringify(contractNames),
    "plugin MCP launcher tool order or names did not match docs/tool-contracts.json",
  );

  const claudePluginConnection = await createMcpClient(
    localClaudeServer.command,
    claudeMcpArgs,
    { cwd: claudeMcpCwd },
  );
  connections.push(claudePluginConnection);
  assert(
    claudePluginConnection.serverInfo?.name === "tgchats-local",
    "Claude plugin MCP config did not initialize the tgchats local MCP server",
  );
  const claudePluginToolsList = await claudePluginConnection.client.listTools(
    {},
    { timeout: 5_000 },
  );
  const claudePluginToolNames = claudePluginToolsList.tools.map(
    (tool) => tool.name,
  );
  assert(
    JSON.stringify(claudePluginToolNames) === JSON.stringify(contractNames),
    "Claude plugin MCP config tool order or names did not match docs/tool-contracts.json",
  );

  console.log(
    JSON.stringify(
      {
        checked: {
          authStatus,
          cliHelp: true,
          codexPlugins: [hostedCodexManifest.name, localCodexManifest.name],
          claudePlugins: [hostedClaudeManifest.name, localClaudeManifest.name],
          contracts: contractNames.length,
          mcpInitialize: mcpConnection.serverInfo,
          pluginMcpInitialize: pluginConnection.serverInfo,
          claudePluginMcpInitialize: claudePluginConnection.serverInfo,
          mcpTools: toolNames.length,
          pluginMcpTools: pluginToolNames.length,
          claudePluginMcpTools: claudePluginToolNames.length,
          mcpErrors: true,
          sessionPathRedaction: true,
        },
        ok: true,
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled(
    connections.reverse().map((connection) => connection.close()),
  );
}
