import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const defaultPackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

type EnvironmentOptions = {
  currentWorkingDirectory?: string;
  environment?: NodeJS.ProcessEnv;
  // The MCP server starts in whatever directory the client chose (Claude Code
  // uses the open project), so a project's .env must not configure it.
  includeCurrentDirectory?: boolean;
  packageRoot?: string;
  userHomeDirectory?: string;
};

export function getEnvironmentFileCandidates({
  currentWorkingDirectory = process.cwd(),
  environment = process.env,
  includeCurrentDirectory = true,
  packageRoot = defaultPackageRoot,
  userHomeDirectory = homedir(),
}: EnvironmentOptions = {}) {
  const configRoot = environment.XDG_CONFIG_HOME?.trim()
    ? environment.XDG_CONFIG_HOME
    : join(userHomeDirectory, ".config");
  const candidates = [
    environment.TGCHATS_ENV_PATH,
    includeCurrentDirectory ? join(currentWorkingDirectory, ".env") : undefined,
    join(packageRoot, ".env"),
    join(configRoot, "telegram-for-ai-agents", ".env"),
  ];

  return Array.from(
    new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))),
  );
}

export function loadEnvironment(options: EnvironmentOptions = {}) {
  for (const envPath of getEnvironmentFileCandidates(options)) {
    config({ path: envPath, quiet: true });
  }
}
