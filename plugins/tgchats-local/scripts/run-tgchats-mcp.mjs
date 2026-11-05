#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTgchatsMcpLaunch } from "./resolve-launch.mjs";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const { command, args, cwd } = resolveTgchatsMcpLaunch({ pluginRoot });

const child = spawn(command, args, {
  cwd,
  env: process.env,
  stdio: "inherit",
});

let forwardingSignal = false;

function forwardSignal(signal) {
  if (forwardingSignal) return;
  forwardingSignal = true;
  if (!child.killed) child.kill(signal);
}

process.once("SIGINT", () => forwardSignal("SIGINT"));
process.once("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    if (forwardingSignal) process.exit(0);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(
    "Unable to start tgchats local. Install the tgchats-mcp binary in PATH (npm install, npm run build, and npm link in a clone of chihoai/telegram-for-ai-agents).",
  );
  console.error(error.message);
  process.exit(1);
});
