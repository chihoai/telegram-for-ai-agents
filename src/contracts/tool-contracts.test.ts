import { describe, expect, it } from "vitest";
import { TOOL_CONTRACT_DEFINITIONS } from "./tool-contracts.js";
import exportedToolContracts from "../../docs/tool-contracts.json" with { type: "json" };

describe("TOOL_CONTRACT_DEFINITIONS", () => {
  it("uses unique tool names", () => {
    const names = TOOL_CONTRACT_DEFINITIONS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("matches the exported machine-readable contract artifact", () => {
    expect(exportedToolContracts).toEqual(TOOL_CONTRACT_DEFINITIONS);
  });

  it("accepts numeric and canonical string rule ids for cleanup tools", () => {
    for (const name of ["rules.disable", "rules.delete"]) {
      const tool = TOOL_CONTRACT_DEFINITIONS.find(
        (candidate) => candidate.name === name,
      );
      expect(tool?.inputSchema).toMatchObject({
        properties: {
          ruleId: {
            oneOf: [
              { type: "integer", minimum: 1 },
              { type: "string", pattern: "^[1-9]\\d*$" },
            ],
          },
        },
      });
    }
  });

  it("allows bounded dialog limits for rule execution tools", () => {
    for (const name of ["rules.run", "rules.dryRun"]) {
      const tool = TOOL_CONTRACT_DEFINITIONS.find(
        (candidate) => candidate.name === name,
      );
      expect(tool?.inputSchema).toMatchObject({
        properties: {
          dialogs: { type: "integer", minimum: 1, maximum: 1000 },
        },
      });
    }
  });

  it("requires title and peer for folders.update create", () => {
    const tool = TOOL_CONTRACT_DEFINITIONS.find(
      (candidate) => candidate.name === "folders.update",
    );
    expect(tool?.inputSchema).toMatchObject({
      oneOf: expect.arrayContaining([
        expect.objectContaining({
          required: ["action", "title", "peer"],
          properties: { action: { enum: ["create"] } },
        }),
      ]),
    });
  });

  it("advertises accountId on every local MCP tool", () => {
    for (const tool of TOOL_CONTRACT_DEFINITIONS) {
      expect(tool.inputSchema).toMatchObject({
        properties: {
          accountId: { type: "string" },
        },
      });
    }
  });

  it("advertises complete client metadata for every local MCP tool", () => {
    for (const tool of TOOL_CONTRACT_DEFINITIONS) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toEqual({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      });
      expect(tool.outputSchema).toMatchObject({
        type: "object",
        required: ["ok"],
        properties: {
          ok: { type: "boolean" },
        },
      });
    }
  });

  it("locks exact annotations for every local MCP tool", () => {
    const expected: Record<string, [boolean, boolean, boolean, boolean]> = {
      "auth.status": [true, false, true, false],
      "account.whoami": [true, false, true, true],
      "dialogs.list": [true, false, true, true],
      "chat.read": [true, false, true, true],
      "search.messages": [true, false, true, true],
      "folders.list": [true, false, true, true],
      "folders.update": [false, true, false, true],
      "folders.create": [false, false, false, true],
      "folders.addDialog": [false, false, false, true],
      "folders.removeDialog": [false, true, false, true],
      "outbox.preview": [false, false, false, true],
      "outbox.sendApproved": [false, false, true, true],
      "message.sendDraft": [false, false, false, true],
      "members.invitePreview": [false, false, false, true],
      "members.inviteApproved": [false, false, true, true],
      "groups.leavePreview": [false, false, false, true],
      "groups.leaveApproved": [false, true, true, true],
      "tags.get": [true, false, true, false],
      "tags.set": [false, true, false, false],
      "tags.clear": [false, true, false, false],
      "tags.suggest": [false, true, false, true],
      "company.get": [true, false, true, false],
      "company.link": [false, true, false, false],
      "company.unlink": [false, true, false, false],
      "company.suggest": [false, true, false, true],
      "tasks.today": [true, false, true, false],
      "tasks.add": [false, false, false, false],
      "tasks.done": [false, true, false, false],
      "tasks.suggest": [false, false, false, true],
      "summary.show": [true, false, true, false],
      "summary.refresh": [false, true, false, true],
      "nudge.generate": [true, false, true, true],
      "rules.list": [true, false, true, false],
      "rules.add": [false, false, false, false],
      "rules.disable": [false, true, false, false],
      "rules.delete": [false, true, false, false],
      "rules.run": [false, true, false, true],
      "rules.dryRun": [true, false, true, true],
      "rules.log": [true, false, true, false],
      "sync.backfill": [false, false, false, true],
      "sync.once": [false, false, false, true],
      "session.logout": [false, true, false, true],
    };

    expect(Object.keys(expected).sort()).toEqual(
      TOOL_CONTRACT_DEFINITIONS.map((tool) => tool.name).sort(),
    );
    for (const tool of TOOL_CONTRACT_DEFINITIONS) {
      expect([
        tool.annotations.readOnlyHint,
        tool.annotations.destructiveHint,
        tool.annotations.idempotentHint,
        tool.annotations.openWorldHint,
      ]).toEqual(expected[tool.name]);
    }
  });
});
