#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const skillsDir = path.join(repoRoot, "skills");
const catalogPath = path.join(skillsDir, "catalog.json");
const toolContractsPath = path.join(repoRoot, "docs", "tool-contracts.json");

const cloudWriteTools = new Set([
  "outbox.preview",
  "outbox.sendApproved",
  "message.sendDraft",
  "members.invitePreview",
  "members.inviteApproved",
  "folders.create",
  "folders.addDialog",
  "folders.removeDialog",
]);

const plannedTools = new Set(["groups.leavePreview", "groups.leaveApproved"]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseFrontmatter(filePath, body) {
  const match = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    fail(`${filePath}: missing YAML frontmatter`);
    return {};
  }

  const frontmatter = {};
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.endsWith(":")) {
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (pair) {
      frontmatter[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
    }
  }
  return frontmatter;
}

function validateLinks(filePath, body) {
  const dir = path.dirname(filePath);
  const linkPattern = /\[[^\]]+\]\((?!https?:\/\/|#)([^)]+)\)/g;
  for (const match of body.matchAll(linkPattern)) {
    const target = match[1].split("#")[0];
    if (!target) {
      continue;
    }
    const resolved = path.resolve(dir, target);
    if (!fs.existsSync(resolved)) {
      fail(`${filePath}: broken link ${match[1]}`);
    }
  }
}

function validateAllowedTools(filePath, frontmatter, knownTools) {
  const allowedTools = frontmatter["allowed-tools"];
  if (!allowedTools) {
    return;
  }

  const toolPattern = /(?:mcp|chiho-cli)\(([^)]+)\)/g;
  for (const match of allowedTools.matchAll(toolPattern)) {
    const toolName = match[1];
    if (!knownTools.has(toolName)) {
      fail(`${filePath}: unknown allowed tool ${toolName}`);
    }
  }
}

function validateAssetJson(skillDir) {
  const assetsDir = path.join(skillDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const assetPath = path.join(assetsDir, entry.name);
    try {
      readJson(assetPath);
    } catch (error) {
      fail(`${assetPath}: invalid JSON (${error.message})`);
    }
  }
}

function validateCatalog(skillNames) {
  const catalog = readJson(catalogPath);
  if (!Array.isArray(catalog)) {
    fail(`${catalogPath}: expected an array`);
    return;
  }

  const catalogNames = new Set();
  for (const entry of catalog) {
    if (!entry || typeof entry !== "object") {
      fail(`${catalogPath}: catalog entries must be objects`);
      continue;
    }
    if (typeof entry.name !== "string" || !skillNames.has(entry.name)) {
      fail(`${catalogPath}: unknown skill ${entry.name}`);
    }
    if (catalogNames.has(entry.name)) {
      fail(`${catalogPath}: duplicate skill ${entry.name}`);
    }
    catalogNames.add(entry.name);

    for (const field of ["path", "templates", "examples"]) {
      if (typeof entry[field] !== "string") {
        fail(`${catalogPath}: ${entry.name}.${field} must be a string`);
        continue;
      }
      const resolved = path.join(repoRoot, entry[field]);
      if (!fs.existsSync(resolved)) {
        fail(`${catalogPath}: ${entry.name}.${field} does not exist: ${entry[field]}`);
      }
    }
  }
}

function main() {
  const exportedContracts = readJson(toolContractsPath);
  const knownTools = new Set(exportedContracts.map((tool) => tool.name));
  for (const tool of cloudWriteTools) knownTools.add(tool);
  for (const tool of plannedTools) knownTools.add(tool);

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const skillNames = new Set(entries);

  for (const entry of entries) {
    const skillPath = path.join(skillsDir, entry, "SKILL.md");
    if (!fs.existsSync(skillPath)) {
      fail(`${entry}: missing SKILL.md`);
      continue;
    }

    const body = fs.readFileSync(skillPath, "utf8");
    const frontmatter = parseFrontmatter(skillPath, body);
    if (!frontmatter.name) {
      fail(`${skillPath}: missing frontmatter name`);
    }
    if (!frontmatter.description) {
      fail(`${skillPath}: missing frontmatter description`);
    }
    if (frontmatter.name && frontmatter.name !== entry) {
      fail(`${skillPath}: frontmatter name must match directory name`);
    }
    validateLinks(skillPath, body);
    validateAllowedTools(skillPath, frontmatter, knownTools);
    validateAssetJson(path.join(skillsDir, entry));
  }
  validateCatalog(skillNames);

  if (!process.exitCode) {
    console.log(`Validated ${entries.length} skill directories.`);
  }
}

main();
