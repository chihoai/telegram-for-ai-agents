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

  it("maps messages.send to send args", () => {
    expect(
      buildToolCommandArgs("messages.send", {
        peer: "alice",
        text: "hello",
        flowRun: 9,
        expectedLastMessageId: 33,
      })
    ).toEqual([
      "send",
      "alice",
      "--text",
      "hello",
      "--flow-run",
      "9",
      "--expected-last-message-id",
      "33",
    ]);
  });

  it("maps flows.run to flow runner args", () => {
    expect(buildToolCommandArgs("flows.run", { flowId: "bd.followup", dryRun: true })).toEqual([
      "flows",
      "run",
      "bd.followup",
      "--dry-run",
    ]);
  });
});
