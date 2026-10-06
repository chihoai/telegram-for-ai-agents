import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The registered app determines its hosted endpoint. A package cannot retarget it.
export async function buildOpenAiReplacement({ publishedZip, output, version }) {
  if (!/^\d+\.\d+\.\d+$/.test(version || "")) throw new Error("Supply a stable package version.");
  const destination = path.resolve(output);
  if (destination === root || destination.startsWith(root + path.sep)) throw new Error("Output must be outside this repository.");
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "chiho-openai-package-"));
  try {
    const entries = execFileSync("unzip", ["-Z1", path.resolve(publishedZip)], { encoding: "utf8" }).trim().split("\n");
    if (entries.some(p => p.startsWith("/") || p.includes("\\") || p.split("/").includes(".."))) throw new Error("Invalid ZIP paths.");
    const listing = execFileSync("unzip", ["-Z", "-l", path.resolve(publishedZip)], { encoding: "utf8" });
    if (/^l[rwx-]{9}\s/m.test(listing)) throw new Error("ZIP symlinks are not supported.");
    if (entries.some(p => [".mcp.json", "mcp.json", "plugin.json"].includes(p))) throw new Error("Use the downloaded registered-app package, without bundled endpoint overrides.");
    execFileSync("unzip", ["-q", path.resolve(publishedZip), "-d", scratch]);
    const manifestPath = path.join(scratch, ".codex-plugin/plugin.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (!/^app-[a-f0-9]{32}$/.test(manifest.name)) throw new Error("Supply the existing published Chiho app ZIP.");
    const previous = (manifest.version || "").split(".").map(Number);
    const next = version.split(".").map(Number);
    if (previous.length !== 3 || previous.some(Number.isNaN) || !next.some((n, i) => n > previous[i] && next.slice(0, i).every((n, j) => n === previous[j]))) throw new Error("Increment the published package version.");
    const appId = "asdk_app_" + manifest.name.slice(4);
    manifest.version = version;
    manifest.apps = "./.app.json";
    manifest.skills = "./skills";
    manifest.description = "Chiho AI connects your authorized Telegram accounts, personal conversation workflows, and shared Chiho team work. Verify the connected Chiho profile, inspect chats, search messages, organize CRM records and follow-ups, and preview consequential Telegram actions for approval.";
    manifest.interface.shortDescription = "Telegram CRM and workflows";
    manifest.interface.longDescription = manifest.description;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await fs.writeFile(path.join(scratch, ".app.json"), JSON.stringify({ apps: { [manifest.name]: { id: appId, required: true } } }, null, 2) + "\n");

    let skill = await fs.readFile(path.join(root, "plugins/chiho-telegram/skills/chiho-telegram/SKILL.md"), "utf8");
    skill = skill.replaceAll("v8", "v9");
    skill = skill.replace("## Connect and choose the scope", `## Verify the connected account

Call \`get_profile\` first. Its opaque \`id\` identifies the Chiho user and scope
authorized by this OAuth connection. Confirm it is the intended profile before
reading CRM data or acting. If an expected profile differs, stop and ask the user
to select the correct saved connection. An \`accountId\` argument cannot switch
Chiho connections. Names and emails may help identify a profile; do not copy
them into unrelated outputs.

For scheduled work, retain the user-verified expected profile ID and selected
Telegram account ID in the existing task's instructions. Check \`get_profile\`
on every run and stop on mismatch. Selection in another chat does not verify
the existing task's binding. If this tool is unavailable, explain that the
connection still needs the v9 update; do not guess the account or disconnect
another saved connection.

## Connect and choose the scope`);
    skill = skill.replace("## Writes and Telegram approval", `## Discover a public chat

If a requested public user or group is outside the synced Chiho inventory,
direct the user to Chiho's **All Telegram chats** search. Telegram Search Results
appear alongside existing results. Select only the intended result and use the
existing **Sync** action. This imports that chat without sending a message or
joining a group. Then rediscover its scoped account and peer in Chiho before
preparing a message. Do not run an account-wide sync, import unrelated history,
change sharing, or add contacts to work around a scope rejection.

## Writes and Telegram approval`);
    await fs.writeFile(path.join(scratch, "skills/chiho-telegram/SKILL.md"), skill);
    await fs.mkdir(destination); // Never overwrite a previously reviewed package.
    await fs.cp(scratch, destination, { recursive: true });
    return { name: manifest.name, version, appId, requiredResource: "https://api.chiho.ai/mcp/v9", endpointConfiguredByPackage: false };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
  console.log(JSON.stringify(await buildOpenAiReplacement({ publishedZip: options["published-zip"], output: options.output, version: options.version }), null, 2));
}
