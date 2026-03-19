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
});
