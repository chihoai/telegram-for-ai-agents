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
      const tool = TOOL_CONTRACT_DEFINITIONS.find((candidate) => candidate.name === name);
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
      const tool = TOOL_CONTRACT_DEFINITIONS.find((candidate) => candidate.name === name);
      expect(tool?.inputSchema).toMatchObject({
        properties: {
          dialogs: { type: "integer", minimum: 1, maximum: 1000 },
        },
      });
    }
  });
});
