import { describe, expect, it, vi } from 'vitest';
import { fetchChatHistory, resolveChatPeer } from './telegram.js';

describe('resolveChatPeer', () => {
  it('uses visible dialogs for numeric peer ids', async () => {
    const peer = {
      id: -1003504325521,
      type: 'chat',
      displayName: 'takopi dev',
      username: null,
    };
    const client = {
      getPeer: vi.fn(),
      iterDialogs: vi.fn(async function* () {
        yield { peer };
      }),
    };

    await expect(resolveChatPeer(client as any, '-1003504325521')).resolves.toBe(peer);
    expect(client.getPeer).not.toHaveBeenCalled();
    expect(client.iterDialogs).toHaveBeenCalledWith({
      limit: 1000,
      pinned: 'include',
      archived: 'keep',
    });
  });

  it('preserves non-numeric peer resolution errors', async () => {
    const error = new Error('Peer with username takopi dev was not found');
    const client = {
      getPeer: vi.fn().mockRejectedValue(error),
      iterDialogs: vi.fn(),
    };

    await expect(resolveChatPeer(client as any, 'takopi dev')).rejects.toBe(error);
    expect(client.iterDialogs).not.toHaveBeenCalled();
  });
});

describe('fetchChatHistory', () => {
  it('passes resolved peer objects to iterHistory', async () => {
    const peer = {
      id: -1003504325521,
      type: 'chat',
      displayName: 'takopi dev',
      username: null,
    };
    const message = {
      id: 3198,
      date: new Date('2026-06-02T05:22:30.000Z'),
      sender: peer,
      text: 'hello',
    };
    const client = {
      iterHistory: vi.fn(async function* () {
        yield message;
      }),
    };

    await expect(
      fetchChatHistory(client as any, { chatId: peer as any, limit: 10 }),
    ).resolves.toEqual([message]);
    expect(client.iterHistory).toHaveBeenCalledWith(peer, { limit: 10 });
  });
});
