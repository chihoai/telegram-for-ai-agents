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

function createMcpClient(command, args) {
  const child = spawn(command, args, {
    cwd: projectRoot,
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

assert(await fileExists(cliPath), `Missing CLI build output at ${cliPath}`);
assert(await fileExists(mcpPath), `Missing MCP build output at ${mcpPath}`);
assert(await fileExists(contractsPath), `Missing contract export at ${contractsPath}`);

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

  console.log(
    JSON.stringify(
      {
        checked: {
          authStatus,
          cliHelp: true,
          contracts: contractNames.length,
          mcpInitialize: initialize.result.serverInfo,
          mcpTools: toolNames.length,
        },
        ok: true,
      },
      null,
      2
    )
  );
} finally {
  await mcpClient.close();
}
