import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_CONTRACT_DEFINITIONS } from "./tool-contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, "../../docs/tool-contracts.json");

await fs.writeFile(
  outputPath,
  `${JSON.stringify(TOOL_CONTRACT_DEFINITIONS, null, 2)}\n`,
  "utf8"
);

console.log(`Wrote ${outputPath}`);
