import { describe, expect, it } from "vitest";
import { parseRuleId, parseRulesRunArgs } from "./rules.js";

describe("parseRuleId", () => {
  it("accepts exact positive integer ids", () => {
    expect(parseRuleId("1")).toBe(1);
    expect(parseRuleId("42")).toBe(42);
  });

  it("rejects partial numeric parses", () => {
    expect(() => parseRuleId("12abc")).toThrow("positive integer");
    expect(() => parseRuleId("12.9")).toThrow("positive integer");
    expect(() => parseRuleId("12-old")).toThrow("positive integer");
    expect(() => parseRuleId("0")).toThrow("positive integer");
    expect(() => parseRuleId(String(Number.MAX_SAFE_INTEGER + 1))).toThrow(
      "positive integer"
    );
  });
});

describe("parseRulesRunArgs", () => {
  it("defaults to non-dry-run over 200 dialogs", () => {
    expect(parseRulesRunArgs([])).toEqual({
      dryRun: false,
      dialogsLimit: 200,
    });
  });

  it("accepts dry-run and a bounded dialog limit", () => {
    expect(parseRulesRunArgs(["--dry-run", "--dialogs", "3"])).toEqual({
      dryRun: true,
      dialogsLimit: 3,
    });
  });

  it("rejects invalid dialog limits", () => {
    expect(() => parseRulesRunArgs(["--dialogs", "0"])).toThrow(
      "--dialogs must be a positive integer"
    );
  });
});
