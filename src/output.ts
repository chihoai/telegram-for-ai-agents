export function isJsonModeArgv(argv: string[]): boolean {
  return argv.includes('--json');
}

export function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function errorPayload(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}
