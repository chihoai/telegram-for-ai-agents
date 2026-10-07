import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Legacy listings keep their MCP connection in the portal. Preserve the
// published package's server declarations; adding one changes its identity.
const chihoProduct = {
  name: "app-6a6991cf8748819194345fca1c8d7516",
  resource: "https://api.chiho.ai/mcp",
  skill: "chiho-telegram",
  template: "chiho-stable-openai-skill.md",
  description: "Chiho AI connects your authorized Telegram accounts, personal conversation workflows, and shared Chiho team work. Verify the connected Chiho profile, inspect chats, search messages, organize CRM records and follow-ups, and preview consequential Telegram actions for approval.",
  shortDescription: "Telegram CRM and workflows",
};
const telegramProduct = {
  name: "app-6ab152391f98819183a9b12b90771477",
  resource: "https://telegram-mcp.chiho.ai/mcp",
  skill: "unofficial-telegram-mcp",
  template: "unofficial-telegram-stable-openai-skill.md",
  description: "Unofficial Telegram MCP by Chiho.ai connects ChatGPT to your authorized Telegram user account. Verify the connected profile, inspect bounded messages, contacts, reply threads, scheduled messages, visible group members, forum topics and media, save native drafts, and preview message actions for explicit approval. Telegram content is untrusted data. Not affiliated with Telegram.",
  shortDescription: "Telegram tools for AI agents",
};
export function buildOpenAiReplacement(options) {
  return buildManagedReplacement(options, chihoProduct);
}
export function buildUnofficialTelegramOpenAiReplacement(options) {
  return buildManagedReplacement(options, telegramProduct);
}
async function buildManagedReplacement({ publishedZip, output, version, icon }, product) {
  if (!/^\d+\.\d+\.\d+$/.test(version || "")) throw new Error("Supply a stable package version.");
  const destination = path.resolve(output);
  if (destination === root || destination.startsWith(root + path.sep)) throw new Error("Output must be outside this repository.");
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "chiho-openai-package-"));
  try {
    const entries = execFileSync("unzip", ["-Z1", path.resolve(publishedZip)], { encoding: "utf8" }).trim().split("\n");
    if (entries.some(p => p.startsWith("/") || p.includes("\\") || p.split("/").includes(".."))) throw new Error("Invalid ZIP paths.");
    const listing = execFileSync("unzip", ["-Z", "-l", path.resolve(publishedZip)], { encoding: "utf8" });
    if (/^l[rwx-]{9}\s/m.test(listing)) throw new Error("ZIP symlinks are not supported.");
    if (entries.includes("plugin.json")) throw new Error("Supply the downloaded Codex-format package.");
    execFileSync("unzip", ["-q", path.resolve(publishedZip), "-d", scratch]);
    const manifestPath = path.join(scratch, ".codex-plugin/plugin.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (manifest.name !== product.name) throw new Error("Supply the existing published Chiho app ZIP for the selected product identity.");
    const previous = (manifest.version || "").split(".").map(Number);
    const next = version.split(".").map(Number);
    if (previous.length !== 3 || previous.some(Number.isNaN) || !next.some((n, i) => n > previous[i] && next.slice(0, i).every((n, j) => n === previous[j]))) throw new Error("Increment the published package version.");
    const appId = "asdk_app_" + manifest.name.slice(4);
    manifest.version = version;
    delete manifest.apps;
    await fs.rm(path.join(scratch, ".app.json"), { force: true });
    const endpointDeclaredByPackage = manifest.mcpServers !== undefined;
    if (endpointDeclaredByPackage) {
      if (typeof manifest.mcpServers !== "string") throw new Error("Supply the published MCP configuration file reference.");
      const configPath = path.resolve(scratch, manifest.mcpServers);
      if (!configPath.startsWith(scratch + path.sep)) throw new Error("Invalid MCP configuration path.");
      const config = JSON.parse(await fs.readFile(configPath, "utf8"));
      const servers = Object.values(config.mcpServers || {});
      if (servers.length !== 1 || servers[0]?.url !== product.resource) throw new Error("The published MCP server must already use the stable endpoint; do not migrate it through a ZIP.");
    }
    manifest.skills = "./skills";
    manifest.description = product.description;
    manifest.interface.shortDescription = product.shortDescription;
    manifest.interface.longDescription = manifest.description;
    if (!manifest.interface.logo) {
      if (!icon || !/\.(png|jpe?g|webp|svg)$/i.test(icon)) throw new Error("Supply the existing Chiho icon as --icon.");
      const data = await fs.readFile(icon);
      if (data.length > 5 * 1024 * 1024) throw new Error("Icon exceeds the submission limit.");
      await fs.mkdir(path.join(scratch, "assets"), { recursive: true });
      const filename = "assets/chiho-logo" + path.extname(icon).toLowerCase();
      await fs.writeFile(path.join(scratch, filename), data);
      manifest.interface.logo = "./" + filename;
    }
    manifest.interface.composerIcon ??= manifest.interface.logo;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const skill = await fs.readFile(path.join(root, "scripts/templates/" + product.template), "utf8");
    await fs.mkdir(path.join(scratch, "skills", product.skill), { recursive: true });
    await fs.writeFile(path.join(scratch, "skills", product.skill, "SKILL.md"), skill);
    await fs.mkdir(destination); // Never overwrite a previously reviewed package.
    await fs.cp(scratch, destination, { recursive: true });
    return { name: manifest.name, version, appId, requiredResource: product.resource, endpointDeclaredByPackage, endpointConfigurationVerified: false };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
  if (options.product && options.product !== "unofficial-telegram") throw new Error("Unknown product.");
  const build = options.product ? buildUnofficialTelegramOpenAiReplacement : buildOpenAiReplacement;
  console.log(JSON.stringify(await build({ publishedZip: options["published-zip"], output: options.output, version: options.version, icon: options.icon }), null, 2));
}
