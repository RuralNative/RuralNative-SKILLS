// Repository-level cap parity (ADR-0030): the four self-contained orientation
// modules and the shell harness must agree on one task-band cap table. Each
// installed skill stays self-contained; this test is the parity mechanism,
// not a shared runtime import.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CAPS, ABSOLUTE_CAP } from "../skills/document-for-agents/orientation.ts";
import {
  ORIENTATION_CAPS as PLAN_CAPS,
  ORIENTATION_ABSOLUTE_CAP as PLAN_ABSOLUTE,
} from "../skills/plan-this/orientation.ts";
import {
  ORIENTATION_CAPS as IMPL_CAPS,
  ORIENTATION_ABSOLUTE_CAP as IMPL_ABSOLUTE,
} from "../skills/implement-this/orientation.ts";
import {
  ORIENTATION_CAPS as REVIEW_CAPS,
  ORIENTATION_ABSOLUTE_CAP as REVIEW_ABSOLUTE,
} from "../skills/review-this/orientation.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..");

const EXPECTED = {
  ordinary: 9000,
  "api-route": 13500,
  "schema-data": 18000,
  "re-orientation": 10500,
};

describe("orientation cap parity across all consumers (ADR-0030)", () => {
  test("the document-for-agents resolver exports the ADR-0030 table", () => {
    assert.deepEqual(CAPS, EXPECTED);
    assert.equal(ABSOLUTE_CAP, 18000);
  });

  test("all four orientation modules report the same table", () => {
    assert.deepEqual(PLAN_CAPS, CAPS);
    assert.deepEqual(IMPL_CAPS, CAPS);
    assert.deepEqual(REVIEW_CAPS, CAPS);
    assert.equal(PLAN_ABSOLUTE, ABSOLUTE_CAP);
    assert.equal(IMPL_ABSOLUTE, ABSOLUTE_CAP);
    assert.equal(REVIEW_ABSOLUTE, ABSOLUTE_CAP);
  });

  test("the shell harness constants match the TypeScript tables", () => {
    const shell = fs.readFileSync(path.join(ROOT, "scripts/docs-check.sh"), "utf8");
    for (const [band, cap] of Object.entries(EXPECTED)) {
      const re = new RegExp(`${band}\\)\\s+cap=(${cap})\\s+;;`);
      assert.ok(re.test(shell), `docs-check.sh must cap ${band} at ${cap}`);
    }
    assert.equal(/cap=(?!13500|18000|10500|9000)\d{4,}/.test(shell), false,
      "docs-check.sh must not carry a stale cap value");
  });

  test("every band cap stays at or below the absolute maximum", () => {
    for (const cap of Object.values(CAPS)) assert.ok(cap <= ABSOLUTE_CAP);
  });
});
