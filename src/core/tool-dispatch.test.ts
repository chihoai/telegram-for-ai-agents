import { describe, expect, it } from "vitest";
import { buildToolCommandArgs } from "./tool-dispatch.js";

describe("buildToolCommandArgs", () => {
  it("maps dialogs.list to inbox args", () => {
    expect(buildToolCommandArgs("dialogs.list", { limit: 15, all: true })).toEqual([
      "inbox",
      "--limit",
      "15",
      "--all",
    ]);
  });

  it("maps folders.update order to folders order", () => {
    expect(
      buildToolCommandArgs("folders.update", {
        action: "order",
        folderIds: ["1", "2", "3"],
      })
    ).toEqual(["folders", "order", "1", "2", "3"]);
  });
});
