#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const builtServer = join(root, "dist", "mcp", "stdio.js");
const devServer = join(root, "src", "mcp", "stdio.ts");
const localTsx = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

let command = "tgchats-mcp";
let args = [];

if (existsSync(builtServer)) {
  command = process.execPath;
  args = [builtServer];
} else if (existsSync(devServer) && existsSync(localTsx)) {
  command = localTsx;
  args = [devServer];
}

const child = spawn(command, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(
    "Unable to start tgchats MCP server. Run `npm install && npm run build`, or install the `tgchats-mcp` binary."
  );
  console.error(error.message);
  process.exit(1);
});
