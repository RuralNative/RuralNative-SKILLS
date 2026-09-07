// Repository-level orientation parity (ADR-0032): the four self-contained
// orientation modules and the shell harness resolve relevant sources without
// a size veto. Each installed skill stays self-contained; this test is the
// parity mechanism, not a shared runtime import.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveOrientation } from "../skills/document-for-agents/orientation.ts";
import { preflightTicketOrientation } from "../skills/plan-this/orientation.ts";
import { preflightWorkerOrientation } from "../skills/implement-this/orientation.ts";
import { resolveReviewOrientation } from "../skills/review-this/orientation.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..");

describe("orientation parity without size gates (ADR-0032)", () => {
  test("all four orientation modules record a large required set without rejection", () => {
    const large = {
      band: "ordinary" as const,
      bytes: 25000,
      sourceCount: 6,
      cacheGap: false,
    };
    const ticket = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this"],
      resolved: large,
    });
    assert.equal(
      ticket.reason,
      "the resolved orientation set records the required sources for incremental reading",
    );

    const worker = preflightWorkerOrientation({
      affectedSeams: ["implement-this"],
      resolved: large,
    });
    assert.equal(
      worker.reason,
      "the resolved orientation set records the required sources for incremental reading",
    );

    const review = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: large,
      sources: ["ARCHITECTURE.md"],
    });
    assert.equal(review.stop, false);
  });

  test("no orientation module exports a cap table or cap-based preflight", () => {
    for (const file of [
      "skills/document-for-agents/orientation.ts",
      "skills/plan-this/orientation.ts",
      "skills/implement-this/orientation.ts",
      "skills/review-this/orientation.ts",
    ]) {
      const code = fs.readFileSync(path.join(ROOT, file), "utf8");
      assert.equal(code.includes("ORIENTATION_CAPS"), false, `${file} must not export a cap table`);
      assert.equal(code.includes("ABSOLUTE_CAP"), false, `${file} must not export an absolute cap`);
      assert.equal(code.includes("withinBudget"), false, `${file} must not decide validity by budget`);
      assert.equal(code.includes("over budget"), false, `${file} must not report an over-budget status`);
    }
  });

  test("the shell harness has no cap constants or size-based route failure", () => {
    const shell = fs.readFileSync(path.join(ROOT, "scripts/docs-check.sh"), "utf8");
    assert.equal(/\)\s+cap=\d+\s+;;/.test(shell), false, "docs-check.sh must not carry per-band cap constants");
    assert.equal(shell.includes("over budget"), false, "docs-check.sh must not fail a route on size");
    assert.ok(shell.includes("orientation routes"), "check 11 must validate orientation routes");
  });

  test("the document resolver keeps source selection without a size veto", () => {
    const code = fs.readFileSync(
      path.join(ROOT, "skills/document-for-agents/orientation.ts"),
      "utf8",
    );
    assert.ok(code.includes("resolveOrientation"), "the resolver must remain");
    assert.equal(code.includes("over: boolean"), false, "the resolver must not return a size verdict");
  });
});
