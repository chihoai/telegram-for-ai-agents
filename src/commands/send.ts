import type { AppContext } from '../app/context.js';
import {
  hasFlag,
  optionValue,
  parseCommandArgs,
  parsePositiveInt,
} from '../app/cli-args.js';
import { requireAccountId } from '../app/account.js';
import { printJson } from '../output.js';
import { sendGuardedMessage } from '../services/outbound.js';

export async function runSend(ctx: AppContext, args: string[]): Promise<void> {
  const parsed = parseCommandArgs(args, [
    '--text',
    '--flow-run',
    '--reason',
    '--expected-last-message-id',
    '--max-inactive-days',
    '--dedupe-window-days',
  ]);
  const peerInput = parsed.positionals[0];
  const text = optionValue(parsed, ['--text']);
  if (!peerInput || !text) {
    throw new Error(
      'Usage: tgchats send <peer> --text "message" [--flow-run N] [--reason "..."] [--expected-last-message-id N] [--dry-run]',
    );
  }

  const flowRunRaw = optionValue(parsed, ['--flow-run']);
  const expectedLastMessageIdRaw = optionValue(parsed, ['--expected-last-message-id']);
  const maxInactiveDaysRaw = optionValue(parsed, ['--max-inactive-days']);
  const dedupeWindowDaysRaw = optionValue(parsed, ['--dedupe-window-days']);
  const accountId = await requireAccountId(ctx);

  const result = await sendGuardedMessage(ctx, {
    accountId,
    peerRef: peerInput,
    text,
    reason: optionValue(parsed, ['--reason']) ?? 'Manual send',
    runId: flowRunRaw ? parsePositiveInt(flowRunRaw, '--flow-run') : undefined,
    expectedLastMessageId: expectedLastMessageIdRaw
      ? parsePositiveInt(expectedLastMessageIdRaw, '--expected-last-message-id')
      : undefined,
    maxInactiveDays: maxInactiveDaysRaw
      ? parsePositiveInt(maxInactiveDaysRaw, '--max-inactive-days')
      : 30,
    dedupeWindowDays: dedupeWindowDaysRaw
      ? parsePositiveInt(dedupeWindowDaysRaw, '--dedupe-window-days')
      : 14,
    dryRun: hasFlag(parsed, ['--dry-run']),
  });

  if (ctx.config.jsonOutput) {
    printJson(result);
    return;
  }

  if (result.blocked) {
    console.log(`Blocked send to ${result.peerDisplayName}: ${result.failures.join('; ')}`);
    return;
  }
  if (result.dryRun) {
    console.log(`Dry-run send prepared for ${result.peerDisplayName}.`);
    return;
  }
  console.log(`Sent message to ${result.peerDisplayName} as Telegram message #${result.telegramMessageId}.`);
}
