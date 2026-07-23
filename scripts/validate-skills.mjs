#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const skillsDir = path.join(repoRoot, "skills");
const catalogPath = path.join(skillsDir, "catalog.json");
const toolContractsPath = path.join(repoRoot, "docs", "tool-contracts.json");
const publicToolContractsPath = path.join(
  repoRoot,
  "docs",
  "public-mcp-tool-contracts.json",
);

const cloudOnlyTools = new Set([
  "folders_delete",
  "sync_peer",
  "write_approve_preview",
]);
const localOnlyTools = new Set([
  "folders_update",
  "rules_dry_run",
  "sync_backfill",
]);
const directSendTools = new Set([
  "groups_leave_approved",
  "members_invite_approved",
  "message_send_draft",
  "outbox_send_approved",
]);
const hostedApprovalFlows = new Map([
  [
    "outbox_send_approved",
    ["outbox_preview", "write_approve_preview", "outbox_send_approved"],
  ],
  [
    "members_invite_approved",
    [
      "members_invite_preview",
      "write_approve_preview",
      "members_invite_approved",
    ],
  ],
  [
    "groups_leave_approved",
    ["groups_leave_preview", "write_approve_preview", "groups_leave_approved"],
  ],
]);
const cloudToolRequiredScopes = new Map([
  [
    "outbox_send_approved",
    ["telegram.message.send", "telegram.batch.write"],
  ],
  ["message_send_draft", ["telegram.message.send"]],
  ["members_invite_approved", ["telegram.members.invite"]],
  ["groups_leave_approved", ["telegram.groups.leave"]],
]);

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

function validateCloudToolScopes(filePath, frontmatter, report = fail) {
  const allowedTools = frontmatter["allowed-tools"];
  const rawScopes = frontmatter["chiho.cloudScopes"];
  if (!allowedTools || !rawScopes) {
    return;
  }

  const scopes = new Set(parseCloudScopes(rawScopes));
  for (const [toolName, requiredScopes] of cloudToolRequiredScopes) {
    if (!allowedTools.includes(`mcp(${toolName})`)) {
      continue;
    }
    for (const requiredScope of requiredScopes) {
      if (!scopes.has(requiredScope)) {
        report(
          `${filePath}: ${toolName} requires cloud scope ${requiredScope}`,
        );
      }
    }
  }
}

function validateToolArrays(filePath, value, knownTools) {
  if (Array.isArray(value)) {
    for (const item of value) validateToolArrays(filePath, item, knownTools);
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "tools" && Array.isArray(child)) {
      for (const toolName of child) {
        if (typeof toolName !== "string" || !knownTools.has(toolName)) {
          fail(`${filePath}: unknown asset tool ${String(toolName)}`);
        }
      }
    }
    validateToolArrays(filePath, child, knownTools);
  }
}

function validateNoSendExamples(filePath, value, report = fail) {
  if (Array.isArray(value)) {
    for (const item of value) validateNoSendExamples(filePath, item, report);
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  const prompt = typeof value.prompt === "string" ? value.prompt : "";
  const explicitlyForbidsSending =
    /\b(?:do\s+not|don't|never|without)(?:\s+[a-z]+){0,3}\s+send(?:ing)?\b/i;
  if (explicitlyForbidsSending.test(prompt)) {
    const tools = Array.isArray(value.tools) ? value.tools : [];
    for (const toolName of tools) {
      if (directSendTools.has(toolName)) {
        report(
          `${filePath}: explicit no-send example must not use ${toolName}`,
        );
      }
    }
  }

  for (const child of Object.values(value)) {
    validateNoSendExamples(filePath, child, report);
  }
}

function validateHostedApprovalExamples(filePath, value, report = fail) {
  if (Array.isArray(value)) {
    for (const item of value) {
      validateHostedApprovalExamples(filePath, item, report);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  if (value.runtime === "chiho-cloud" && Array.isArray(value.tools)) {
    for (const [executor, orderedTools] of hostedApprovalFlows) {
      if (!value.tools.includes(executor)) {
        continue;
      }
      const positions = orderedTools.map((toolName) =>
        value.tools.indexOf(toolName),
      );
      if (
        !positions.every(
          (position, index) =>
            position >= 0 && (index === 0 || position > positions[index - 1]),
        )
      ) {
        report(
          `${filePath}: hosted example must use ${orderedTools.join(" -> ")}`,
        );
      }
    }
  }

  for (const child of Object.values(value)) {
    validateHostedApprovalExamples(filePath, child, report);
  }
}

function validateAssetJson(skillDir, knownTools) {
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
      const asset = readJson(assetPath);
      validateToolArrays(assetPath, asset, knownTools);
      validateNoSendExamples(assetPath, asset);
      validateHostedApprovalExamples(assetPath, asset);
    } catch (error) {
      fail(`${assetPath}: invalid JSON (${error.message})`);
    }
  }
}

function validateSurfaceToolReferences(
  filePath,
  body,
  surfaceTools,
  knownTools,
  report = fail,
) {
  for (const toolName of knownTools) {
    const toolReference = new RegExp(
      `(?<![A-Za-z0-9_])${toolName}(?![A-Za-z0-9_])`,
    );
    if (toolReference.test(body) && !surfaceTools.has(toolName)) {
      report(`${filePath}: ${toolName} is unavailable on this MCP surface`);
    }
  }
}

function validateValidatorGuards(cloudTools, knownTools) {
  const routeErrors = [];
  validateSurfaceToolReferences(
    "route-negative-fixture.md",
    "Use rules_dry_run before continuing.",
    cloudTools,
    knownTools,
    (message) => routeErrors.push(message),
  );
  if (routeErrors.length === 0) {
    fail("route validator must reject an unformatted local-only tool reference");
  }

  for (const prompt of [
    "Never send it.",
    "Do not ever send it.",
    "Continue without actually sending it.",
  ]) {
    const noSendErrors = [];
    validateNoSendExamples(
      "no-send-negative-fixture.json",
      { prompt, tools: ["message_send_draft"] },
      (message) => noSendErrors.push(message),
    );
    if (noSendErrors.length === 0) {
      fail(`no-send validator must reject direct-send tools for: ${prompt}`);
    }
  }

  const hostedApprovalErrors = [];
  validateHostedApprovalExamples(
    "hosted-approval-negative-fixture.json",
    {
      runtime: "chiho-cloud",
      tools: ["outbox_preview", "outbox_send_approved"],
    },
    (message) => hostedApprovalErrors.push(message),
  );
  if (hostedApprovalErrors.length === 0) {
    fail("hosted example validator must reject a missing approval step");
  }

  const cloudScopeErrors = [];
  validateCloudToolScopes(
    "cloud-scope-negative-fixture.md",
    {
      "allowed-tools": "mcp(outbox_send_approved)",
      "chiho.cloudScopes": "telegram.message.send",
    },
    (message) => cloudScopeErrors.push(message),
  );
  if (cloudScopeErrors.length === 0) {
    fail("cloud scope validator must reject a missing executor scope");
  }
}

function validatePortableToolNotation(filePath, body) {
  const dottedWildcard = /\b(?:folders|outbox|rules)\.\*/g;
  for (const match of body.matchAll(dottedWildcard)) {
    fail(`${filePath}: dotted wildcard tool alias is not portable: ${match[0]}`);
  }
}

function parseCloudScopes(rawScopes) {
  if (typeof rawScopes !== "string" || rawScopes.trim().length === 0) {
    return [];
  }
  return rawScopes
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .sort();
}

function validateCatalog(skillNames, frontmatterByName) {
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

    const frontmatter = frontmatterByName.get(entry.name);
    if (frontmatter) {
      const catalogScopes = Array.isArray(entry.requiredCloudScopes)
        ? [...entry.requiredCloudScopes].sort()
        : [];
      const frontmatterScopes = parseCloudScopes(frontmatter["chiho.cloudScopes"]);
      if (JSON.stringify(catalogScopes) !== JSON.stringify(frontmatterScopes)) {
        fail(`${catalogPath}: ${entry.name}.requiredCloudScopes must match SKILL.md chiho.cloudScopes`);
      }
    }

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
  const publicContracts = readJson(publicToolContractsPath);
  const localTools = new Set();
  const internalNames = exportedContracts.map((tool) => tool.name);
  for (const tool of publicContracts) {
    if (
      typeof tool.name !== "string" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(tool.name)
    ) {
      fail(`${publicToolContractsPath}: invalid public MCP name contract`);
      continue;
    }
    localTools.add(tool.name);
  }
  const cloudTools = new Set(
    [...localTools].filter((toolName) => !localOnlyTools.has(toolName)),
  );
  for (const tool of cloudOnlyTools) cloudTools.add(tool);
  const knownTools = new Set([...localTools, ...cloudTools]);
  const commonTools = new Set(
    [...localTools].filter((toolName) => cloudTools.has(toolName)),
  );
  validateValidatorGuards(cloudTools, knownTools);

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const skillNames = new Set(entries);
  const frontmatterByName = new Map();

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
    if (frontmatter.name) {
      frontmatterByName.set(frontmatter.name, frontmatter);
    }
    validateLinks(skillPath, body);
    validateAllowedTools(skillPath, frontmatter, knownTools);
    validateCloudToolScopes(skillPath, frontmatter);
    validatePortableToolNotation(skillPath, body);
    for (const internalName of internalNames) {
      if (body.includes(internalName)) {
        fail(
          `${skillPath}: public skill instructions must use the portable MCP name for ${internalName}`,
        );
      }
    }
    validateAssetJson(path.join(skillsDir, entry), knownTools);

    for (const [referenceName, surfaceTools] of [
      ["cloud-mcp.md", cloudTools],
      ["tgchats-local.md", localTools],
      ["flow.md", commonTools],
    ]) {
      const referencePath = path.join(
        skillsDir,
        entry,
        "references",
        referenceName,
      );
      if (!fs.existsSync(referencePath)) continue;
      const referenceBody = fs.readFileSync(referencePath, "utf8");
      validatePortableToolNotation(referencePath, referenceBody);
      validateSurfaceToolReferences(
        referencePath,
        referenceBody,
        surfaceTools,
        knownTools,
      );
    }
  }
  validateCatalog(skillNames, frontmatterByName);

  if (!process.exitCode) {
    console.log(`Validated ${entries.length} skill directories.`);
  }
}

main();
