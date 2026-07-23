import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../app/context.js";

const telegramServices = vi.hoisted(() => ({
  ensureAuthorized: vi.fn(),
  fetchChatHistory: vi.fn(),
  formatMessagePreview: vi.fn(() => "preview"),
  listDialogs: vi.fn(),
  resolveChatPeer: vi.fn(),
}));
const databaseWrites = vi.hoisted(() => ({
  insertMessage: vi.fn(),
  upsertDialog: vi.fn(),
  upsertPeer: vi.fn(),
}));

vi.mock("../services/telegram.js", () => telegramServices);
vi.mock("../db/writes.js", () => databaseWrites);

import { runChat } from "./chat.js";
import { runInbox } from "./inbox.js";

const peer = {
  id: 123,
  type: "user",
  displayName: "Test User",
  username: "testuser",
};
const message = {
  id: 456,
  date: new Date("2026-07-22T00:00:00.000Z"),
  sender: peer,
  text: "Hello",
};

function createContext(): AppContext {
  return {
    config: {
      all: false,
      jsonOutput: true,
      limit: 5,
    },
    db: {},
    telegram: {
      getMe: vi.fn(async () => ({ displayName: "Owner", id: 1 })),
    },
  } as unknown as AppContext;
}

describe("read-only Telegram commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    telegramServices.ensureAuthorized.mockResolvedValue(undefined);
    telegramServices.listDialogs.mockResolvedValue([
      { lastMessage: message, peer },
    ]);
    telegramServices.resolveChatPeer.mockResolvedValue(peer);
    telegramServices.fetchChatHistory.mockResolvedValue([message]);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("does not persist dialogs while listing the inbox", async () => {
    await runInbox(createContext());

    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toEqual({
      ok: true,
      account: { displayName: "Owner", id: 1 },
      count: 1,
      dialogs: [
        {
          index: 1,
          peer: {
            id: 123,
            type: "user",
            displayName: "Test User",
            username: "testuser",
          },
          lastMessage: {
            id: 456,
            date: "2026-07-22T00:00:00.000Z",
            preview: "preview",
          },
        },
      ],
    });
    expect(databaseWrites.upsertPeer).not.toHaveBeenCalled();
    expect(databaseWrites.upsertDialog).not.toHaveBeenCalled();
    expect(databaseWrites.insertMessage).not.toHaveBeenCalled();
  });

  it("returns the exact empty inbox JSON contract", async () => {
    telegramServices.listDialogs.mockResolvedValue([]);

    await runInbox(createContext());

    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toEqual({
      ok: true,
      account: { displayName: "Owner", id: 1 },
      count: 0,
      dialogs: [],
    });
  });

  it("does not persist messages while reading a chat", async () => {
    await runChat(createContext(), ["123"]);

    expect(databaseWrites.upsertPeer).not.toHaveBeenCalled();
    expect(databaseWrites.upsertDialog).not.toHaveBeenCalled();
    expect(databaseWrites.insertMessage).not.toHaveBeenCalled();
  });
});
