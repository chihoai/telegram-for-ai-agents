import { afterEach, describe, expect, it } from "vitest";
import { buildToolCommandArgs } from "./tool-dispatch.js";

describe("buildToolCommandArgs", () => {
  const originalAccountLabel = process.env.TELEGRAM_ACCOUNT_LABEL;

  afterEach(() => {
    if (originalAccountLabel === undefined) {
      delete process.env.TELEGRAM_ACCOUNT_LABEL;
    } else {
      process.env.TELEGRAM_ACCOUNT_LABEL = originalAccountLabel;
    }
  });

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
        action: "create",
        title: "Leads",
        peer: "@alice",
      })
    ).toEqual(["folders", "create", "--title", "Leads", "--peer", "@alice"]);

    expect(
      buildToolCommandArgs("folders.update", {
        action: "order",
        folderIds: ["1", "2", "3"],
      })
    ).toEqual(["folders", "order", "1", "2", "3"]);
  });

  it("requires an initial peer for folders.update create", () => {
    expect(() =>
      buildToolCommandArgs("folders.update", {
        action: "create",
        title: "Leads",
      })
    ).toThrow("peer is required");
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

  it("maps payload write tools to payload commands without accountId", () => {
    process.env.TELEGRAM_ACCOUNT_LABEL = "default";
    const cases: Array<{
      toolName: string;
      input: Record<string, unknown>;
      expectedPrefix: string[];
      expectedPayload: Record<string, unknown>;
    }> = [
      {
        toolName: "outbox.preview",
        input: { accountId: "default", peers: ["@alice"], text: "Hello" },
        expectedPrefix: ["outbox", "preview"],
        expectedPayload: { peers: ["@alice"], text: "Hello" },
      },
      {
        toolName: "message.sendDraft",
        input: { accountId: "default", peer: "@alice", text: "Hello" },
        expectedPrefix: ["message", "send-draft"],
        expectedPayload: { peer: "@alice", text: "Hello" },
      },
      {
        toolName: "members.invitePreview",
        input: { accountId: "default", userId: "123", groups: ["@group"] },
        expectedPrefix: ["members", "invite-preview"],
        expectedPayload: { userId: "123", groups: ["@group"] },
      },
      {
        toolName: "groups.leavePreview",
        input: { accountId: "default", groups: ["@group"] },
        expectedPrefix: ["groups", "leave-preview"],
        expectedPayload: { groups: ["@group"] },
      },
    ];

    for (const { toolName, input, expectedPrefix, expectedPayload } of cases) {
      expect(buildToolCommandArgs(toolName, input)).toEqual([
        ...expectedPrefix,
        "--payload",
        JSON.stringify(expectedPayload),
      ]);
    }
  });

  it("maps rules.dryRun to rules run dry-run", () => {
    expect(buildToolCommandArgs("rules.dryRun", { dialogs: 3 })).toEqual([
      "rules",
      "run",
      "--dry-run",
      "--dialogs",
      "3",
    ]);
  });

  it("rejects malformed or over-limit rule dialog bounds", () => {
    for (const dialogs of [0, "3abc", "3.7", "3.0", "1e2", "01", true, [3], 1001]) {
      expect(() => buildToolCommandArgs("rules.run", { dialogs })).toThrow(
        dialogs === 1001
          ? "--dialogs must be at most 1000"
          : "--dialogs must be a positive integer"
      );
      expect(() => buildToolCommandArgs("rules.dryRun", { dialogs })).toThrow(
        dialogs === 1001
          ? "--dialogs must be at most 1000"
          : "--dialogs must be a positive integer"
      );
    }
  });

  it("maps cleanup tools to cleanup commands", () => {
    expect(buildToolCommandArgs("tags.clear", { peer: "@alice" })).toEqual([
      "tags",
      "clear",
      "@alice",
    ]);
    expect(buildToolCommandArgs("tags.set", { peer: "@alice", tags: [] })).toEqual([
      "tags",
      "clear",
      "@alice",
    ]);
    expect(buildToolCommandArgs("company.unlink", { peer: "@alice" })).toEqual([
      "company",
      "unlink",
      "@alice",
    ]);
    expect(buildToolCommandArgs("rules.disable", { ruleId: 12 })).toEqual([
      "rules",
      "disable",
      "12",
    ]);
    expect(buildToolCommandArgs("rules.delete", { ruleId: 12 })).toEqual([
      "rules",
      "delete",
      "12",
    ]);
    expect(buildToolCommandArgs("rules.disable", { ruleId: "12" })).toEqual([
      "rules",
      "disable",
      "12",
    ]);
    expect(buildToolCommandArgs("rules.delete", { ruleId: "12" })).toEqual([
      "rules",
      "delete",
      "12",
    ]);
  });

  it("rejects non-integer cleanup rule ids", () => {
    for (const ruleId of [
      true,
      "1.0",
      "01",
      "12abc",
      1.5,
      0,
      -1,
      Number.MAX_SAFE_INTEGER + 1,
      String(Number.MAX_SAFE_INTEGER + 1),
    ]) {
      expect(() => buildToolCommandArgs("rules.disable", { ruleId })).toThrow(
        "ruleId must be a positive integer"
      );
      expect(() => buildToolCommandArgs("rules.delete", { ruleId })).toThrow(
        "ruleId must be a positive integer"
      );
    }
  });

  it("accepts accountId inputs that match the configured local account label", () => {
    process.env.TELEGRAM_ACCOUNT_LABEL = "work";
    expect(buildToolCommandArgs("dialogs.list", { accountId: "work", limit: 2 })).toEqual([
      "inbox",
      "--limit",
      "2",
    ]);
  });

  it("accepts the default accountId when TELEGRAM_ACCOUNT_LABEL is unset", () => {
    delete process.env.TELEGRAM_ACCOUNT_LABEL;
    expect(buildToolCommandArgs("folders.list", { accountId: "default" })).toEqual([
      "folders",
      "list",
    ]);
  });

  it("rejects accountId inputs that do not match the configured local account label", () => {
    process.env.TELEGRAM_ACCOUNT_LABEL = "default";
    expect(() =>
      buildToolCommandArgs("dialogs.list", {
        accountId: "other-account",
      })
    ).toThrow('accountId "other-account" does not match configured local account "default"');
  });
});
