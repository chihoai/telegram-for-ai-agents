import type { FlowBudgetDefinition, FlowBudgetUsage } from './types.js';

export class BudgetExceededError extends Error {}

export class FlowBudgetTracker {
  private readonly startedAt = new Date();
  private toolCallsUsed = 0;
  private aiCallsUsed = 0;
  private outboundMessagesUsed = 0;
  private retriesUsed = 0;

  constructor(private readonly definition: FlowBudgetDefinition) {}

  snapshot(): FlowBudgetUsage {
    return {
      ...this.definition,
      toolCallsUsed: this.toolCallsUsed,
      aiCallsUsed: this.aiCallsUsed,
      outboundMessagesUsed: this.outboundMessagesUsed,
      retriesUsed: this.retriesUsed,
      startedAt: this.startedAt.toISOString(),
    };
  }

  assertCandidateCount(count: number): void {
    if (count > this.definition.maxCandidates) {
      throw new BudgetExceededError(
        `Candidate count ${count} exceeds budget maxCandidates=${this.definition.maxCandidates}.`,
      );
    }
  }

  consumeToolCall(label: string): void {
    this.toolCallsUsed += 1;
    if (this.toolCallsUsed > this.definition.maxToolCalls) {
      throw new BudgetExceededError(
        `Tool call budget exceeded during ${label} (${this.toolCallsUsed}/${this.definition.maxToolCalls}).`,
      );
    }
  }

  consumeAiCall(label: string): void {
    this.aiCallsUsed += 1;
    if (this.aiCallsUsed > this.definition.maxAiCalls) {
      throw new BudgetExceededError(
        `AI call budget exceeded during ${label} (${this.aiCallsUsed}/${this.definition.maxAiCalls}).`,
      );
    }
  }

  consumeOutboundMessage(label: string): void {
    this.outboundMessagesUsed += 1;
    if (this.outboundMessagesUsed > this.definition.maxOutboundMessages) {
      throw new BudgetExceededError(
        `Outbound send budget exceeded during ${label} (${this.outboundMessagesUsed}/${this.definition.maxOutboundMessages}).`,
      );
    }
  }

  consumeRetry(label: string): void {
    this.retriesUsed += 1;
    if (this.retriesUsed > this.definition.maxRetriesPerStep * this.definition.maxCandidates) {
      throw new BudgetExceededError(
        `Retry budget exceeded during ${label}.`,
      );
    }
  }

  assertWallTime(): void {
    const elapsedSeconds = (Date.now() - this.startedAt.getTime()) / 1000;
    if (elapsedSeconds > this.definition.maxWallTimeSeconds) {
      throw new BudgetExceededError(
        `Wall time budget exceeded (${elapsedSeconds.toFixed(1)}s/${this.definition.maxWallTimeSeconds}s).`,
      );
    }
  }
}
