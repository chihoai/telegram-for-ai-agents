#!/usr/bin/env node

import "dotenv/config";

import { getToolContractDefinitions } from "../contracts/tool-contracts.js";
import { executeLocalToolCall } from "../core/tool-dispatch.js";

interface JsonRpcRequest {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: any;
}

const MCP_PROTOCOL_VERSION = "2025-11-25";

function encodeMessage(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"),
    body,
  ]);
}

function sendMessage(payload: Record<string, unknown>) {
  process.stdout.write(encodeMessage(payload));
}

function sendResult(id: JsonRpcRequest["id"], result: unknown) {
  sendMessage({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });
}

function sendError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: Record<string, unknown>
) {
  sendMessage({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
  });
}

async function handleRequest(message: JsonRpcRequest) {
  if (!message.method) {
    sendError(message.id, -32600, "Invalid Request");
    return;
  }

  if (message.method === "initialize") {
    sendResult(message.id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: "tgchats-local",
        title: "tgchats Local",
        version: "1.0.0",
      },
      instructions:
        "Prefer read-first workflows. Use explicit mutation tools only when requested.",
    });
    return;
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "tools/list") {
    sendResult(message.id, {
      tools: getToolContractDefinitions().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
    return;
  }

  if (message.method === "tools/call") {
    try {
      const toolName = String(message.params?.name || "");
      const payload = await executeLocalToolCall(
        toolName,
        message.params?.arguments || {}
      );
      sendResult(message.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
        structuredContent: payload,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      sendError(message.id, -32000, messageText);
    }
    return;
  }

  sendError(message.id, -32601, "Method not found");
}

let buffer = Buffer.alloc(0);

function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.subarray(0, headerEnd).toString("utf8");
    const contentLengthHeader = headerText
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-length:"));

    if (!contentLengthHeader) {
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }

    const contentLength = Number.parseInt(
      contentLengthHeader.split(":")[1]?.trim() || "",
      10
    );

    if (!Number.isFinite(contentLength)) {
      buffer = buffer.subarray(headerEnd + 4);
      continue;
    }

    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;

    if (buffer.length < messageEnd) {
      return;
    }

    const body = buffer.subarray(messageStart, messageEnd).toString("utf8");
    buffer = buffer.subarray(messageEnd);

    try {
      void handleRequest(JSON.parse(body));
    } catch (error) {
      sendError(null, -32700, "Parse error", {
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

process.stdin.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer();
});
