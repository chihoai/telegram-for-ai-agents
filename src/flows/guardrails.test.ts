import { describe, expect, it } from 'vitest';
import { evaluateSendGuardrails } from './guardrails.js';

describe('evaluateSendGuardrails', () => {
  it('blocks duplicate outbound text and stale state changes', () => {
    const result = evaluateSendGuardrails({
      history: [
        {
          id: 11,
          date: new Date('2026-03-18T00:00:00.000Z'),
          senderId: 42,
          text: 'Following up on this.',
        },
      ],
      now: new Date('2026-03-19T00:00:00.000Z'),
      meId: 42,
      expectedLastMessageId: 10,
      maxInactiveDays: 30,
      dedupeWindowDays: 14,
      text: 'Following up on this.',
      recentLoggedTexts: [],
      priorRunPeerSendCount: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('Latest chat state changed after planning.');
    expect(
      result.failures.some((failure) => failure.includes('Duplicate outbound message')),
    ).toBe(true);
  });
});
