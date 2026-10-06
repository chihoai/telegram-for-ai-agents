import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { buildOpenAiReplacement } from "../../scripts/build-chiho-openai-replacement.mjs";

const scratch: string[] = [];
afterEach(async () => { await Promise.all(scratch.splice(0).map(p => fs.rm(p, { recursive: true, force: true }))); });
async function fixture(name = "app-6a6991cf8748819194345fca1c8d7516", version = "1.0.1") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chiho-openai-test-"));
  scratch.push(dir);
  const src = path.join(dir, "source");
  await fs.mkdir(path.join(src, ".codex-plugin"), { recursive: true });
  await fs.mkdir(path.join(src, "assets"));
  await fs.writeFile(path.join(src, ".codex-plugin/plugin.json"), JSON.stringify({ name, version, interface: { displayName: "Chiho AI", logo: "./assets/logo.svg" } }));
  await fs.writeFile(path.join(src, "assets/logo.svg"), '<svg viewBox="0 0 64 64"/>');
  await fs.mkdir(path.join(src, "skills/chiho-telegram"), { recursive: true });
  await fs.writeFile(path.join(src, "skills/chiho-telegram/SKILL.md"), "Old instructions");
  const publishedZip = path.join(dir, "published.zip");
  execFileSync("zip", ["-qr", publishedZip, "."], { cwd: src });
  return { publishedZip, output: path.join(dir, "replacement"), version: "2.0.1" };
}
describe("OpenAI replacement package", () => {
  it("preserves the listing identity and assets and declares the stable URL without app references", async () => {
    const args = await fixture();
    const result = await buildOpenAiReplacement(args);
    expect(result.endpointConfigurationVerified).toBe(false);
    expect(result.endpointDeclaredByPackage).toBe(true);
    expect(result.appId).toBe("asdk_app_6a6991cf8748819194345fca1c8d7516");
    const manifest = JSON.parse(await fs.readFile(path.join(args.output, ".codex-plugin/plugin.json"), "utf8"));
    expect(manifest.name).toBe("app-6a6991cf8748819194345fca1c8d7516");
    expect(manifest.version).toBe("2.0.1");
    expect(manifest.interface.logo).toBe("./assets/logo.svg");
    expect(manifest.interface.composerIcon).toBe("./assets/logo.svg");
    expect(manifest.apps).toBeUndefined();
    const mcp = JSON.parse(await fs.readFile(path.join(args.output, ".mcp.json"), "utf8"));
    expect(mcp.mcpServers["chiho-cloud"].url).toBe("https://api.chiho.ai/mcp");
    await expect(fs.access(path.join(args.output, ".app.json"))).rejects.toThrow();
    expect(await fs.readFile(path.join(args.output, "assets/logo.svg"), "utf8")).toContain("64 64");
    const skill = await fs.readFile(path.join(args.output, "skills/chiho-telegram/SKILL.md"), "utf8");
    expect(skill).toContain("get_profile");
    expect(skill).toContain("on every run and stop on mismatch");
    expect(skill).toContain("https://api.chiho.ai/mcp");
    expect(skill).not.toMatch(/\/mcp\/v[89]/);
    expect(skill).toContain("chiho.crm.extended");
    expect(skill).toContain("outbox_preview_extended");
    expect(skill).toContain("bound team");
    await expect(buildOpenAiReplacement(args)).rejects.toThrow();
  });
  it("rejects a different package identity instead of creating a duplicate listing", async () => {
    await expect(buildOpenAiReplacement(await fixture("chiho-preview-v9"))).rejects.toThrow("existing published Chiho app ZIP");
  });
  it("rejects a version downgrade", async () => {
    await expect(buildOpenAiReplacement(await fixture(undefined, "3.0.0"))).rejects.toThrow("Increment");
  });
  it("requires a bundled icon when the old release ZIP does not contain one", async () => {
    const args = await fixture();
    const src = path.join(path.dirname(args.publishedZip), "source");
    const p = path.join(src, ".codex-plugin/plugin.json");
    const m = JSON.parse(await fs.readFile(p, "utf8"));
    delete m.interface.logo;
    await fs.writeFile(p, JSON.stringify(m));
    execFileSync("zip", ["-qr", args.publishedZip, "."], { cwd: src });
    await expect(buildOpenAiReplacement(args)).rejects.toThrow("existing Chiho icon");
    await buildOpenAiReplacement({ ...args, icon: path.join(src, "assets/logo.svg") });
    expect(await fs.readFile(path.join(args.output, "assets/chiho-logo.svg"), "utf8")).toContain("64 64");
  });
});
