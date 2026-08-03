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

  it("returns an ID-bearing continuation cursor for a full chat page", async () => {
    const olderMessage = {
      ...message,
      id: 455,
    };
    telegramServices.fetchChatHistory.mockResolvedValueOnce([
      message,
      olderMessage,
    ]);

    await runChat(createContext(), ["123", "--limit", "2"]);

    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toMatchObject({
      count: 2,
      nextOffsetDate: 1_784_678_400,
      nextOffsetMessageId: 455,
    });
    expect(telegramServices.fetchChatHistory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 2 }),
    );
  });

  it("forwards all valid chat cursor flags through the command layer", async () => {
    await runChat(createContext(), [
      "123",
      "--limit",
      "200",
      "--since",
      "400",
      "--offset-date",
      "1700000000",
      "--offset-message-id",
      "456",
    ]);

    expect(telegramServices.fetchChatHistory).toHaveBeenCalledWith(
      expect.anything(),
      {
        chatId: peer,
        limit: 200,
        offsetDate: 1_700_000_000,
        offsetMessageId: 456,
        sinceMessageId: 400,
      },
    );
  });

  it("rejects chat cursor flags outside Telegram's integer range", async () => {
    await expect(
      runChat(createContext(), [
        "123",
        "--offset-message-id",
        "2147483648",
      ]),
    ).rejects.toThrow("--offset-message-id must be at most 2147483647");
    expect(telegramServices.ensureAuthorized).not.toHaveBeenCalled();
  });

  it("rejects lossy date-only chat continuation", async () => {
    await expect(
      runChat(createContext(), ["123", "--offset-date", "1700000000"]),
    ).rejects.toThrow("--offset-message-id is required with --offset-date");
    expect(telegramServices.ensureAuthorized).not.toHaveBeenCalled();
  });
});
