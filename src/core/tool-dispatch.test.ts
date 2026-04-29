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

  it("maps PR 9 folder tools to folder commands", () => {
    expect(
      buildToolCommandArgs("folders.create", {
        title: "Leads",
        peer: "@alice",
        idempotencyKey: "folder-1",
      })
    ).toEqual([
      "folders",
      "create",
      "--title",
      "Leads",
      "--peer",
      "@alice",
      "--idempotency-key",
      "folder-1",
    ]);

    expect(
      buildToolCommandArgs("folders.addDialog", {
        folderId: "7",
        peer: "@alice",
      })
    ).toEqual(["folders", "add", "7", "@alice"]);
  });

  it("maps preview write tools to payload commands", () => {
    expect(
      buildToolCommandArgs("outbox.preview", {
        peers: ["@alice"],
        text: "Hello",
      })
    ).toEqual([
      "outbox",
      "preview",
      "--payload",
      JSON.stringify({ peers: ["@alice"], text: "Hello" }),
    ]);
  });

  it("maps rules.dryRun to rules run dry-run", () => {
    expect(buildToolCommandArgs("rules.dryRun", {})).toEqual([
      "rules",
      "run",
      "--dry-run",
    ]);
  });

  it("rejects unsupported accountId inputs", () => {
    expect(() =>
      buildToolCommandArgs("dialogs.list", {
        accountId: "other-account",
      })
    ).toThrow("accountId is not supported");
  });
});
