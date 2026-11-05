import { chmodSync } from 'node:fs';
import { chmod, mkdir, writeFile } from 'node:fs/promises';

// Session storage grants full Telegram account access, and preview, run, and
// media records hold message content, so only the owner may read them. Modes
// are best effort on platforms without POSIX permissions.
export const PRIVATE_DIR_MODE = 0o700;
export const PRIVATE_FILE_MODE = 0o600;

const SQLITE_SIDECAR_SUFFIXES = ['', '-wal', '-shm', '-journal'];

export function restrictProcessFileCreation() {
  process.umask(0o077);
}

export async function ensurePrivateDir(path: string) {
  await mkdir(path, { recursive: true, mode: PRIVATE_DIR_MODE });
  await chmod(path, PRIVATE_DIR_MODE).catch(() => undefined);
}

export async function writePrivateFile(path: string, data: string) {
  await writeFile(path, data, { mode: PRIVATE_FILE_MODE });
  // The creation mode does not apply when the file already exists.
  await chmod(path, PRIVATE_FILE_MODE).catch(() => undefined);
}

export async function restrictFile(path: string) {
  await chmod(path, PRIVATE_FILE_MODE).catch(() => undefined);
}

// SQLite creates its sidecar files with the database file's mode, so this also
// covers sidecars created later. Existing sidecars are tightened directly.
export function restrictSqliteFilesSync(databasePath: string) {
  for (const suffix of SQLITE_SIDECAR_SUFFIXES) {
    try {
      chmodSync(`${databasePath}${suffix}`, PRIVATE_FILE_MODE);
    } catch {
      // Missing sidecar or unsupported file system.
    }
  }
}
