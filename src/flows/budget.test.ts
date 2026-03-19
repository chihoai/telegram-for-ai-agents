import { describe, expect, it } from 'vitest';
import { BudgetExceededError, FlowBudgetTracker } from './budget.js';

describe('FlowBudgetTracker', () => {
  it('tracks usage and raises when tool call budget is exceeded', () => {
    const tracker = new FlowBudgetTracker({
      maxCandidates: 1,
      maxToolCalls: 1,
      maxAiCalls: 1,
      maxRetriesPerStep: 1,
      maxOutboundMessages: 1,
      maxWallTimeSeconds: 60,
    });

    tracker.consumeToolCall('first');
    expect(() => tracker.consumeToolCall('second')).toThrow(BudgetExceededError);
  });
});
