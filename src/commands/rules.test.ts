import { describe, expect, it } from "vitest";
import { parseRuleId } from "./rules.js";

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
