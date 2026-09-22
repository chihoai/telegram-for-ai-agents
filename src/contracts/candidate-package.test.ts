import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
// @ts-expect-error Build tooling is a standalone Node script.
import { buildCandidate } from "../../scripts/build-chiho-crm-candidate.mjs";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });
describe("isolated Chiho candidate packages", () => {
  it.each(["v2", "v3", "v4"])("binds both client manifests and documentation to %s", async (release) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chiho-candidate-test-")); temporary.push(dir);
    const backendManifest = path.join(dir, "backend.json");
    await fs.writeFile(backendManifest, JSON.stringify({ formatVersion: 1, release, sourceCommit: "a".repeat(40), contractSha256: "b".repeat(64) }));
    const output = path.join(dir, "plugin");
    const record = await buildCandidate({ release, environment: "staging", output, backendManifest });
    for (const filename of [".claude-plugin/plugin.json", ".mcp.json"]) {
      const manifest = JSON.parse(await fs.readFile(path.join(output, filename), "utf8"));
      expect(manifest.mcpServers["chiho-cloud"].url).toBe(`https://stagingapi.chiho.ai/mcp/${release}`);
    }
    const skill = await fs.readFile(path.join(output, "skills/chiho-telegram/SKILL.md"), "utf8");
    expect(skill).toContain("crm_dialogs_list"); expect(skill).toContain("team_queue_approve");
    expect(skill.includes("Media tools require")).toBe(release !== "v2");
    expect(skill.includes("message_action_preview supports")).toBe(release === "v4");
    expect(record.qualification).toBe("pending");
    await expect(buildCandidate({ release, environment: "staging", output, backendManifest })).rejects.toThrow();
  });
  it("refuses to overwrite the published package", async () => {
    await expect(buildCandidate({ release: "v2", environment: "production", output: path.resolve("plugins/chiho-telegram"), backendManifest: "unused" })).rejects.toThrow("outside this repository");
  });
});
