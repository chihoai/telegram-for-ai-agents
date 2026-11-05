import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGroups, runMembers, runOutbox } from "./agentWrites.js";
import type { AppContext } from "../app/context.js";

function createContext(tempDir: string, overrides: Record<string, unknown> = {}) {
  let nextMessageId = 100;
  const telegram = {
    start: vi.fn(async () => undefined),
    getPeer: vi.fn(async (peer: string | number) => ({
      id: Number(peer) || 1,
      type: "user",
      displayName: `Peer ${peer}`,
      username: null,
    })),
    sendText: vi.fn(async () => ({ id: nextMessageId++ })),
    addChatMembers: vi.fn(async () => []),
    createInviteLink: vi.fn(async () => ({ link: "https://t.me/+single-use" })),
    exportInviteLink: vi.fn(async () => ({ link: "https://t.me/+primary" })),
    leaveChat: vi.fn(async () => undefined),
    ...overrides,
  };

  return {
    config: {
      jsonOutput: true,
      accountLabel: "default",
      sessionPath: join(tempDir, "telegram.session"),
    },
    telegram,
  } as unknown as AppContext;
}

describe("approved agent writes", () => {
  let tempDir: string;
  let log: ReturnType<typeof vi.spyOn>;

  function lastOutput() {
    return JSON.parse(String(log.mock.calls.at(-1)?.[0]));
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "tgchats-agent-writes-test-"));
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    log.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function previewId(run: () => Promise<void>) {
    await run();
    return String(lastOutput().preview.previewId);
  }

  it("sends an approved outbox preview once, whatever the retry key", async () => {
    const ctx = createContext(tempDir);
    const id = await previewId(() =>
      runOutbox(ctx, ["preview", "--payload", JSON.stringify({ peers: ["1", "2"], text: "Hello" })]),
    );

    await runOutbox(ctx, ["send-approved", id, "--idempotency-key", "first"]);
    expect(lastOutput()).toMatchObject({ ok: true, count: 2 });

    await runOutbox(ctx, ["send-approved", id, "--idempotency-key", "first"]);
    expect(lastOutput()).toMatchObject({ idempotentReplay: true });

    await expect(
      runOutbox(ctx, ["send-approved", id, "--idempotency-key", "second"]),
    ).rejects.toThrow(/already completed/);
    await expect(runOutbox(ctx, ["send-approved", id])).rejects.toThrow(/already completed/);
    expect(ctx.telegram.sendText).toHaveBeenCalledTimes(2);
  });

  it("does not resend a partially failed batch under a new key", async () => {
    const ctx = createContext(tempDir, {
      sendText: vi.fn(async (peer: unknown) => {
        if (String(peer) === "2") throw new Error("USER_IS_BLOCKED");
        return { id: 7 };
      }),
    });
    const id = await previewId(() =>
      runOutbox(ctx, ["preview", "--payload", JSON.stringify({ peers: ["1", "2"], text: "Hello" })]),
    );

    await runOutbox(ctx, ["send-approved", id, "--idempotency-key", "first"]);
    expect(lastOutput()).toMatchObject({ ok: false });

    await expect(
      runOutbox(ctx, ["send-approved", id, "--idempotency-key", "retry"]),
    ).rejects.toThrow(/already completed/);
    expect(ctx.telegram.sendText).toHaveBeenCalledTimes(2);
  });

  it("leaves a preview pending when authorization fails before execution", async () => {
    const start = vi.fn(async () => undefined);
    const ctx = createContext(tempDir, { start });
    const id = await previewId(() =>
      runOutbox(ctx, ["preview", "--payload", JSON.stringify({ peers: ["1"], text: "Hello" })]),
    );

    start.mockRejectedValueOnce(new Error("AUTH_KEY_UNREGISTERED"));
    await expect(
      runOutbox(ctx, ["send-approved", id, "--idempotency-key", "first"]),
    ).rejects.toThrow(/AUTH_KEY_UNREGISTERED/);

    await runOutbox(ctx, ["send-approved", id, "--idempotency-key", "first"]);
    expect(lastOutput()).toMatchObject({ ok: true, count: 1 });
    expect(ctx.telegram.sendText).toHaveBeenCalledTimes(1);
  });

  it("invites and leaves once per approved preview", async () => {
    const ctx = createContext(tempDir);
    const inviteId = await previewId(() =>
      runMembers(ctx, ["invite-preview", "--payload", JSON.stringify({ userId: "5", groups: ["-1001"] })]),
    );
    await runMembers(ctx, ["invite-approved", inviteId, "--idempotency-key", "first"]);
    await expect(
      runMembers(ctx, ["invite-approved", inviteId, "--idempotency-key", "second"]),
    ).rejects.toThrow(/already completed/);
    expect(ctx.telegram.addChatMembers).toHaveBeenCalledTimes(1);

    const leaveId = await previewId(() =>
      runGroups(ctx, ["leave-preview", "--payload", JSON.stringify({ groups: ["-1001"] })]),
    );
    await runGroups(ctx, ["leave-approved", leaveId, "--idempotency-key", "first"]);
    await expect(
      runGroups(ctx, ["leave-approved", leaveId, "--idempotency-key", "second"]),
    ).rejects.toThrow(/already completed/);
    expect(ctx.telegram.leaveChat).toHaveBeenCalledTimes(1);
  });

  it("falls back to a single-use invite link without revoking the group's link", async () => {
    const ctx = createContext(tempDir, {
      addChatMembers: vi.fn(async () => [{ userId: 5 }]),
    });
    const id = await previewId(() =>
      runMembers(ctx, ["invite-preview", "--payload", JSON.stringify({ userId: "5", groups: ["-1001"] })]),
    );
    expect(lastOutput().preview.summary.fallback).toMatch(/single-use invite link/);

    await runMembers(ctx, ["invite-approved", id, "--idempotency-key", "first"]);

    expect(lastOutput()).toMatchObject({
      ok: true,
      results: [{ group: "-1001", ok: true, sentInviteLink: true }],
    });
    expect(ctx.telegram.exportInviteLink).not.toHaveBeenCalled();
    expect(ctx.telegram.createInviteLink).toHaveBeenCalledWith(-1001, {
      usageLimit: 1,
      expires: expect.any(Date),
    });
    expect(ctx.telegram.sendText).toHaveBeenCalledWith(
      5,
      expect.stringContaining("https://t.me/+single-use"),
    );
  });
});
