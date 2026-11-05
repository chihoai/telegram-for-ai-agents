import { describe, expect, it } from 'vitest';
import { describeMessageAction } from './clientTools.js';

describe('message action preview summaries', () => {
  it('names every target and setting the approved action will apply', () => {
    expect(
      describeMessageAction({ action: 'forward', peer: '@boss', messageId: 7, targetPeer: '@attacker' }),
    ).toBe('Forward Telegram message 7 from @boss to @attacker.');
    expect(
      describeMessageAction({ action: 'delete', peer: '@team', messageId: 8, revoke: true }),
    ).toBe('Delete Telegram message 8 in @team for everyone.');
    expect(
      describeMessageAction({ action: 'delete', peer: '@team', messageId: 8, revoke: false }),
    ).toBe('Delete Telegram message 8 in @team for this account only.');
    expect(
      describeMessageAction({ action: 'edit', peer: '@team', messageId: 9, text: 'New "plan"\nToday' }),
    ).toBe('Edit Telegram message 9 in @team. New text: "New \\"plan\\"\\nToday"');
    expect(
      describeMessageAction({ action: 'pin', peer: '@team', messageId: 10, notify: true, bothSides: false }),
    ).toBe('Pin Telegram message 10 in @team (notify members: yes; pin for both sides: no).');
    expect(
      describeMessageAction({ action: 'reaction', peer: '@team', messageId: 11, emoji: null }),
    ).toBe("Remove this account's reaction from Telegram message 11 in @team.");
  });
});
