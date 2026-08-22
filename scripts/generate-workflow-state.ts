// Regenerates the three runtime copies of the authored workflow state core.
// Usage: node scripts/generate-workflow-state.ts [--check]
// Exit codes: 0 in sync (or written), 1 drift in --check mode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const AUTHORED_PATH = "scripts/workflow-state.ts";
export const COPY_PATHS = [
  "skills/plan-this/workflow-state.ts",
  "skills/implement-this/workflow-state.ts",
  "skills/review-this/workflow-state.ts",
];

export function readAuthored(): string {
  return fs.readFileSync(path.join(ROOT, AUTHORED_PATH), "utf8");
}

export function driftedCopies(): string[] {
  const authored = readAuthored();
  const drifted: string[] = [];
  for (const rel of COPY_PATHS) {
    let actual: string | null = null;
    try {
      actual = fs.readFileSync(path.join(ROOT, rel), "utf8");
    } catch {
      actual = null;
    }
    if (actual !== authored) drifted.push(rel);
  }
  return drifted;
}

export function regenerate(): void {
  const authored = readAuthored();
  for (const rel of COPY_PATHS) {
    fs.writeFileSync(path.join(ROOT, rel), authored);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (process.argv.includes("--check")) {
    const drifted = driftedCopies();
    if (drifted.length > 0) {
      console.error("workflow-state copies drifted from the authored source:");
      for (const rel of drifted) console.error(`  ${rel}`);
      process.exit(1);
    }
    console.log("workflow-state copies match the authored source");
  } else {
    regenerate();
    console.log(`regenerated ${COPY_PATHS.length} workflow-state copies`);
  }
}
