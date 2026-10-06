import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Public submission requires an MCP URL; .app.json is for installed packages.
export async function buildOpenAiReplacement({ publishedZip, output, version, icon }) {
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
    if (!/^app-[a-f0-9]{32}$/.test(manifest.name)) throw new Error("Supply the existing published Chiho app ZIP.");
    const previous = (manifest.version || "").split(".").map(Number);
    const next = version.split(".").map(Number);
    if (previous.length !== 3 || previous.some(Number.isNaN) || !next.some((n, i) => n > previous[i] && next.slice(0, i).every((n, j) => n === previous[j]))) throw new Error("Increment the published package version.");
    const appId = "asdk_app_" + manifest.name.slice(4);
    manifest.version = version;
    delete manifest.apps;
    await fs.rm(path.join(scratch, ".app.json"), { force: true });
    manifest.mcpServers = "./.mcp.json";
    manifest.skills = "./skills";
    manifest.description = "Chiho AI connects your authorized Telegram accounts, personal conversation workflows, and shared Chiho team work. Verify the connected Chiho profile, inspect chats, search messages, organize CRM records and follow-ups, and preview consequential Telegram actions for approval.";
    manifest.interface.shortDescription = "Telegram CRM and workflows";
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
    await fs.writeFile(path.join(scratch, ".mcp.json"), JSON.stringify({ mcpServers: { "chiho-cloud": { url: "https://api.chiho.ai/mcp" } } }, null, 2) + "\n");

    const skill = await fs.readFile(path.join(root, "scripts/templates/chiho-stable-openai-skill.md"), "utf8");
    await fs.writeFile(path.join(scratch, "skills/chiho-telegram/SKILL.md"), skill);
    await fs.mkdir(destination); // Never overwrite a previously reviewed package.
    await fs.cp(scratch, destination, { recursive: true });
    return { name: manifest.name, version, appId, requiredResource: "https://api.chiho.ai/mcp", endpointDeclaredByPackage: true, endpointConfigurationVerified: false };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
  console.log(JSON.stringify(await buildOpenAiReplacement({ publishedZip: options["published-zip"], output: options.output, version: options.version, icon: options.icon }), null, 2));
}
