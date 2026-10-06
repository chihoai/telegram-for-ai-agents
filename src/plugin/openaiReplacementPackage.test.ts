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
  it("preserves the listing identity and assets while adding profile checks without an endpoint override", async () => {
    const args = await fixture();
    const result = await buildOpenAiReplacement(args);
    expect(result.endpointConfiguredByPackage).toBe(false);
    expect(result.appId).toBe("asdk_app_6a6991cf8748819194345fca1c8d7516");
    const manifest = JSON.parse(await fs.readFile(path.join(args.output, ".codex-plugin/plugin.json"), "utf8"));
    expect(manifest.name).toBe("app-6a6991cf8748819194345fca1c8d7516");
    expect(manifest.version).toBe("2.0.1");
    expect(manifest.interface.logo).toBe("./assets/logo.svg");
    expect(await fs.readFile(path.join(args.output, "assets/logo.svg"), "utf8")).toContain("64 64");
    const skill = await fs.readFile(path.join(args.output, "skills/chiho-telegram/SKILL.md"), "utf8");
    expect(skill).toContain("get_profile");
    expect(skill).toContain("on every run and stop on mismatch");
    expect(skill).toContain("https://api.chiho.ai/mcp/v9");
    expect(skill).not.toContain("/mcp/v8");
    await expect(buildOpenAiReplacement(args)).rejects.toThrow();
  });
  it("rejects a different package identity instead of creating a duplicate listing", async () => {
    await expect(buildOpenAiReplacement(await fixture("chiho-preview-v9"))).rejects.toThrow("existing published Chiho app ZIP");
  });
  it("rejects a version downgrade", async () => {
    await expect(buildOpenAiReplacement(await fixture(undefined, "3.0.0"))).rejects.toThrow("Increment");
  });
});
