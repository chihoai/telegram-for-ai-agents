export interface GuardrailCheckResult {
  ok: boolean;
  failures: string[];
}

export interface SendGuardrailInput {
  history: Array<{
    id: number;
    date: Date;
    senderId: number;
    text: string;
  }>;
  now: Date;
  meId: number;
  expectedLastMessageId?: number;
  maxInactiveDays: number;
  dedupeWindowDays: number;
  text: string;
  recentLoggedTexts: string[];
  priorRunPeerSendCount: number;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function latestMessageId(
  history: Array<{
    id: number;
    date: Date;
  }>,
): number | null {
  if (history.length === 0) return null;
  return history.reduce((latest, message) => (message.id > latest ? message.id : latest), history[0].id);
}

export function evaluateSendGuardrails(input: SendGuardrailInput): GuardrailCheckResult {
  const failures: string[] = [];

  if (input.history.length === 0) {
    failures.push('Cannot send into a thread with no prior history.');
  }

  if (input.priorRunPeerSendCount > 0) {
    failures.push('A message was already sent to this peer in the current flow run.');
  }

  const latestId = latestMessageId(input.history);
  if (
    input.expectedLastMessageId !== undefined &&
    latestId !== null &&
    latestId !== input.expectedLastMessageId
  ) {
    failures.push('Latest chat state changed after planning.');
  }

  const latest = input.history
    .slice()
    .sort((left, right) => right.date.getTime() - left.date.getTime())[0];
  if (latest) {
    const inactiveMs = input.now.getTime() - latest.date.getTime();
    const inactiveDays = inactiveMs / (1000 * 60 * 60 * 24);
    if (inactiveDays > input.maxInactiveDays) {
      failures.push(`Thread is inactive for more than ${input.maxInactiveDays} days.`);
    }
  }

  const normalizedOutgoing = normalizeText(input.text);
  const dedupeCutoff = input.now.getTime() - input.dedupeWindowDays * 24 * 60 * 60 * 1000;
  const recentSelfTexts = input.history
    .filter(
      (message) =>
        message.senderId === input.meId &&
        message.date.getTime() >= dedupeCutoff &&
        normalizeText(message.text) === normalizedOutgoing,
    )
    .map((message) => message.text);
  const loggedDuplicates = input.recentLoggedTexts.filter(
    (message) => normalizeText(message) === normalizedOutgoing,
  );

  if (recentSelfTexts.length > 0 || loggedDuplicates.length > 0) {
    failures.push('Duplicate outbound message detected within the dedupe window.');
  }

  return { ok: failures.length === 0, failures };
}
