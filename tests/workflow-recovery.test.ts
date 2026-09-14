import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { driftedCopies, RECOVERY_COPY_PATHS } from "../scripts/generate-workflow-state.ts";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

test("all four standalone stages load the same recovery contract before work", () => {
  assert.equal(RECOVERY_COPY_PATHS.length, 4);
  assert.deepEqual(driftedCopies(), []);
  for (const stage of ["plan-this", "implement-this", "review-this", "fix-this"]) {
    const skill = read(`skills/${stage}/SKILL.md`);
    assert.match(skill, /Read `recovery.md` on entry, after interruption, and before reporting a blocker/);
    assert.equal(read(`skills/${stage}/recovery.md`), read("scripts/workflow-recovery.md"));
  }
});

test("recovery retains authority, proof, retry bounds, and local preservation", () => {
  const contract = read("scripts/workflow-recovery.md");
  for (const requirement of [
    /original human request from session history/,
    /fresh session needs a human instruction/,
    /Later pause, stop, status-only, and\nhandoff-only instructions take precedence/,
    /exact changed paths, index and worktree content digests/,
    /complete command\/output\/exit-status receipts/,
    /historical RED from real logs, never manufacture it/,
    /Retain the attempted cause, operation, and observations across interruption/,
    /verified durable Git snapshot/,
    /Do not apply saved edits onto a different revision/,
    /Do not install skills or edit your own permission configuration/,
    /agent cannot restart a terminated host process/,
  ]) assert.match(contract, requirement);
});

test("planning reconciles partial publication without inventing another approval", () => {
  const skill = read("skills/plan-this/SKILL.md");
  assert.match(skill, /Dirty source files do not block planning and stay untouched/);
  assert.match(skill, /add a missing approved parent link, blocker edge, or label only after confirming it is absent/);
  assert.match(skill, /Stop for explicit approval/);
});

test("implementation rechecks repair eligibility after checked checkout preparation", () => {
  const skill = read("skills/implement-this/SKILL.md");
  assert.match(skill, /re-run `decideRepairPath` on the observed prepared checkout/);
  assert.match(skill, /after all other intake gates and the requirements pin pass/);
  assert.doesNotMatch(skill, /No automatic reset, stash, checkout switching/);
});

test("finalization treats an already completed push as progress, not a blocker", () => {
  const skill = read("skills/fix-this/SKILL.md");
  assert.match(skill, /even before the final `fix-progress-v2` checkpoint exists/);
  assert.match(skill, /mark the push complete and continue/);
  assert.match(skill, /never force-push/);
  assert.doesNotMatch(skill, /no checkpoint starts fresh;/);
  assert.doesNotMatch(skill, /Any other mismatch stops without switching, stashing/);
});
