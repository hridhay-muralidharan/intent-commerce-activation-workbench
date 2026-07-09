import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "schemas", "agent-output.schema.json");
const contractPath = join(root, "agent", "commerce-analyst.md");
const runsDir = join(root, ".runs");

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) {
      flags[value.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      positional.push(value);
    }
  }
  return { command: positional[0], flags };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function hashInput(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function createPacket(scenarioId, requestedAgent) {
  const scenarioPath = join(root, "agent", "scenarios", `${scenarioId}.json`);
  if (!existsSync(scenarioPath)) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  const scenarioText = readFileSync(scenarioPath, "utf8");
  const scenario = JSON.parse(scenarioText);
  const inputHash = hashInput(scenarioText);
  const runId = `${scenarioId}-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}`;
  const runDir = join(runsDir, runId);
  mkdirSync(runDir, { recursive: true });

  const packet = {
    runId,
    requestedAgent,
    inputHash,
    promptVersion: "commerce-analyst-1.0",
    scenario
  };
  const packetPath = join(runDir, "packet.json");
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);

  const contract = readFileSync(contractPath, "utf8");
  const prompt = `${contract}

## Run metadata

- Run ID: ${runId}
- Input hash: ${inputHash}
- Requested agent label: ${requestedAgent}
- Current time: ${new Date().toISOString()}

## Scenario packet

${JSON.stringify(packet, null, 2)}

Return only a JSON object that matches schemas/agent-output.schema.json. Set provenance.mode to "cli_agent", provenance.agent to "${requestedAgent}", provenance.inputHash to "${inputHash}", and provenance.promptVersion to "commerce-analyst-1.0".`;
  const promptPath = join(runDir, "prompt.md");
  writeFileSync(promptPath, `${prompt}\n`);

  return { runDir, runId, packetPath, promptPath, prompt };
}

function validator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(loadJson(schemaPath));
}

function validateOutput(outputPath, packetPath) {
  if (!existsSync(outputPath)) throw new Error(`Output not found: ${outputPath}`);
  const output = loadJson(outputPath);
  const packet = loadJson(packetPath);
  const validate = validator();
  if (!validate(output)) {
    throw new Error(`Schema validation failed:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
  if (output.runId !== packet.runId) throw new Error("Output runId does not match the packet.");
  if (output.provenance.inputHash !== packet.inputHash) {
    throw new Error("Output inputHash does not match the packet.");
  }
  if (output.opportunityId !== packet.scenario.opportunity.id) {
    throw new Error("Output opportunityId does not match the scenario.");
  }
  const evidenceIds = new Set(packet.scenario.evidence.map((item) => item.id));
  const invalidRefs = output.evidenceRefs.filter((reference) => !evidenceIds.has(reference));
  if (invalidRefs.length) throw new Error(`Unknown evidence references: ${invalidRefs.join(", ")}`);
  if (output.reviewRequired !== true) throw new Error("Human review must remain required.");
  return output;
}

function extractClaudeResult(stdout) {
  const envelope = JSON.parse(stdout);
  if (envelope.is_error) throw new Error("Claude Code returned an error result.");
  if (typeof envelope.result !== "string") throw new Error("Claude Code result text is missing.");
  const trimmed = envelope.result.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function runAgent(agent, packet) {
  const outputPath = join(packet.runDir, "output.json");
  if (agent === "codex") {
    const result = spawnSync(
      "codex",
      [
        "exec",
        "-C",
        root,
        "--skip-git-repo-check",
        "-s",
        "read-only",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        packet.prompt
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"] }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Codex exited with status ${result.status}.`);
  } else if (agent === "claude") {
    const result = spawnSync(
      "claude",
      [
        "-p",
        packet.prompt,
        "--output-format",
        "json",
        "--permission-mode",
        "plan",
        "--max-turns",
        "6"
      ],
      { cwd: root, encoding: "utf8" }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Claude exited with status ${result.status}.`);
    writeFileSync(outputPath, `${JSON.stringify(extractClaudeResult(result.stdout), null, 2)}\n`);
  } else {
    throw new Error(`Unsupported agent: ${agent}`);
  }
  validateOutput(outputPath, packet.packetPath);
  console.log(`Validated agent output: ${outputPath}`);
}

const { command, flags } = parseArgs(process.argv.slice(2));
mkdirSync(runsDir, { recursive: true });

try {
  if (command === "prepare") {
    const scenarioId = flags.scenario ?? "restock-recovery";
    const agent = flags.agent ?? "manual";
    const packet = createPacket(scenarioId, agent);
    console.log(`Prepared work packet: ${packet.promptPath}`);
  } else if (command === "run") {
    const scenarioId = flags.scenario ?? "restock-recovery";
    const agent = flags.agent ?? "codex";
    const packet = createPacket(scenarioId, agent);
    runAgent(agent, packet);
  } else if (command === "validate") {
    if (!flags.run) throw new Error("Pass --run with a run directory or output file.");
    const candidate = resolve(root, flags.run);
    const runDir = candidate.endsWith(".json") ? dirname(candidate) : candidate;
    const outputPath = candidate.endsWith(".json") ? candidate : join(runDir, "output.json");
    validateOutput(outputPath, join(runDir, "packet.json"));
    console.log(`Validated agent output: ${outputPath}`);
  } else {
    throw new Error("Use prepare, run, or validate.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
