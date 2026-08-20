import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../app/context.js";

const dependencies = vi.hoisted(() => ({
  listPersistedDialogs: vi.fn(),
  migrate: vi.fn(),
  requireAccountId: vi.fn(),
}));

vi.mock("../db/inventory.js", () => ({
  listPersistedDialogs: dependencies.listPersistedDialogs,
}));
vi.mock("../db/migrate.js", () => ({ migrate: dependencies.migrate }));
vi.mock("../app/account.js", () => ({
  requireAccountId: dependencies.requireAccountId,
}));

import { runCrm } from "./crm.js";

function context(): AppContext {
  return {
    config: {
      jsonOutput: true,
      accountLabel: "default",
      sessionPath: "/tmp/test.session",
      apiHash: "test-api-hash",
    },
    db: {},
  } as AppContext;
}

describe("persisted CRM dialog pagination", () => {
  let logs: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    logs = [];
    vi.spyOn(console, "log").mockImplementation((value: string) => logs.push(value));
    dependencies.migrate.mockResolvedValue(undefined);
    dependencies.requireAccountId.mockResolvedValue(1n);
    dependencies.listPersistedDialogs.mockResolvedValue({
      total: 2,
      lastSyncedAt: new Date("2026-08-20T00:00:00.000Z"),
      dialogs: [
        {
          peer: {
            id: "1",
            kind: "user",
            displayName: "Alice",
            username: null,
          },
          archived: false,
          pinned: false,
          unreadCount: 0,
          lastMessage: null,
        },
      ],
    });
  });

  it("rejects continuation after a newer inventory snapshot is committed", async () => {
    await runCrm(context(), ["dialogs", "list", "--page-size", "1"]);
    const firstPage = JSON.parse(logs.at(-1) ?? "");

    dependencies.listPersistedDialogs.mockResolvedValueOnce({
      total: 2,
      lastSyncedAt: new Date("2026-08-20T00:01:00.000Z"),
      dialogs: [],
    });

    await expect(
      runCrm(context(), [
        "dialogs",
        "list",
        "--page-size",
        "1",
        "--cursor",
        firstPage.nextCursor,
      ]),
    ).rejects.toThrow("The cursor is invalid, expired, or belongs to another account.");
  });
});
