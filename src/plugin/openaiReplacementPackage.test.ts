import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { buildOpenAiReplacement, buildUnofficialTelegramOpenAiReplacement } from "../../scripts/build-chiho-openai-replacement.mjs";

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
  it("preserves the legacy managed connection without adding a bundled MCP server", async () => {
    const args = await fixture();
    const result = await buildOpenAiReplacement(args);
    expect(result.endpointConfigurationVerified).toBe(false);
    expect(result.endpointDeclaredByPackage).toBe(false);
    expect(result.appId).toBe("asdk_app_6a6991cf8748819194345fca1c8d7516");
    const manifest = JSON.parse(await fs.readFile(path.join(args.output, ".codex-plugin/plugin.json"), "utf8"));
    expect(manifest.name).toBe("app-6a6991cf8748819194345fca1c8d7516");
    expect(manifest.version).toBe("2.0.1");
    expect(manifest.interface.logo).toBe("./assets/logo.svg");
    expect(manifest.interface.composerIcon).toBe("./assets/logo.svg");
    expect(manifest.apps).toBeUndefined();
    expect(manifest.mcpServers).toBeUndefined();
    await expect(fs.access(path.join(args.output, ".mcp.json"))).rejects.toThrow();
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
  it("preserves an already declared stable MCP server name and configuration", async () => {
    const args = await fixture();
    const src = path.join(path.dirname(args.publishedZip), "source");
    const manifestPath = path.join(src, ".codex-plugin/plugin.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.mcpServers = "./.mcp.json";
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    const config = JSON.stringify({ mcpServers: { "original-server-name": { url: "https://api.chiho.ai/mcp" } } });
    await fs.writeFile(path.join(src, ".mcp.json"), config);
    execFileSync("zip", ["-qr", args.publishedZip, "."], { cwd: src });
    const result = await buildOpenAiReplacement(args);
    expect(result.endpointDeclaredByPackage).toBe(true);
    expect(await fs.readFile(path.join(args.output, ".mcp.json"), "utf8")).toBe(config);
  });
  it("rejects a bundled versioned server instead of silently replacing it", async () => {
    const args = await fixture();
    const src = path.join(path.dirname(args.publishedZip), "source");
    const manifestPath = path.join(src, ".codex-plugin/plugin.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.mcpServers = "./.mcp.json";
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    await fs.writeFile(path.join(src, ".mcp.json"), JSON.stringify({ mcpServers: { "original-server-name": { url: "https://api.chiho.ai/mcp/v9" } } }));
    execFileSync("zip", ["-qr", args.publishedZip, "."], { cwd: src });
    await expect(buildOpenAiReplacement(args)).rejects.toThrow("must already use the stable endpoint");
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


describe("Unofficial Telegram OpenAI replacement", () => {
  it("preserves the exact unpublished app identity and portal-managed server while adding its stable skill and bundled icon", async () => {
    const args = await fixture("app-6ab152391f98819183a9b12b90771477", "1.0.0");
    const source = path.join(path.dirname(args.publishedZip), "source");
    await fs.rm(path.join(source, "skills"), { recursive: true });
    execFileSync("zip", ["-qr", args.publishedZip, "."], { cwd: source });
    const result = await buildUnofficialTelegramOpenAiReplacement(args);
    expect(result).toMatchObject({ appId: "asdk_app_6ab152391f98819183a9b12b90771477", requiredResource: "https://telegram-mcp.chiho.ai/mcp", endpointDeclaredByPackage: false, endpointConfigurationVerified: false });
    const manifest = JSON.parse(await fs.readFile(path.join(args.output, ".codex-plugin/plugin.json"), "utf8"));
    expect(manifest.name).toBe("app-6ab152391f98819183a9b12b90771477");
    expect(manifest.mcpServers).toBeUndefined();
    expect(manifest.apps).toBeUndefined();
    const skill = await fs.readFile(path.join(args.output, "skills/unofficial-telegram-mcp/SKILL.md"), "utf8");
    expect(skill).toContain("https://telegram-mcp.chiho.ai/mcp");
    expect(skill).toContain("get_profile");
    expect(skill).toContain("on every run; stop on mismatch");
    expect(skill).toContain("explicitly reconnects");
    expect(skill).toContain("does not require `chiho.crm.extended`");
    expect(skill).not.toContain("https://api.chiho.ai/mcp");
  });
  it("rejects the separate Chiho AI package instead of changing its product", async () => {
    await expect(buildUnofficialTelegramOpenAiReplacement(await fixture())).rejects.toThrow("selected product identity");
    await expect(buildOpenAiReplacement(await fixture("app-6ab152391f98819183a9b12b90771477"))).rejects.toThrow("selected product identity");
  });
});
