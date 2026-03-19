import { describe, expect, it } from 'vitest';
import { parseCommandArgs } from './app/cli-args.js';

describe('parseCommandArgs', () => {
  it('treats negative numeric tokens as positionals', () => {
    const parsed = parseCommandArgs(['-1001234567890']);
    expect(parsed.positionals).toEqual(['-1001234567890']);
    expect(parsed.flags.size).toBe(0);
  });

  it('accepts negative numeric option values', () => {
    const parsed = parseCommandArgs(['--chat', '-1001234567890'], ['--chat']);
    expect(parsed.values.get('--chat')).toBe('-1001234567890');
  });

  it('supports -- end-of-options marker', () => {
    const parsed = parseCommandArgs(['--limit', '5', '--', '-1001234567890', '--json'], [
      '--limit',
    ]);

    expect(parsed.values.get('--limit')).toBe('5');
    expect(parsed.positionals).toEqual(['-1001234567890', '--json']);
    expect(parsed.flags.size).toBe(0);
  });
});
