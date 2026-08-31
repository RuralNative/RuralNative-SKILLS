// document-for-agents:INV-17 — the orientation resolver is deterministic,
// deduplicates shared sources, excludes superseded ADRs unless a leaf
// explicitly requires them, resolves every cap boundary and one byte above,
// stays read-only, and keeps the coverage manifest outside every resolved set.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveOrientation,
  CAPS,
  ABSOLUTE_CAP,
  OrientationResolutionError,
  type Band,
  type Resolved,
} from "../orientation.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..", "..", "..");

type Spec = {
  files: Record<string, string>;
  resolve: { band: Band; seams: string[] };
  expect?: Record<string, unknown>;
};

function build(spec: Spec): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orientation-fixture-"));
  for (const [rel, content] of Object.entries(spec.files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

function padFile(dir: string, rel: string, nBytes: number): void {
  assert.ok(nBytes >= 0, `pad must be non-negative, got ${nBytes}`);
  if (nBytes === 0) return;
  fs.appendFileSync(path.join(dir, rel), "x".repeat(nBytes));
}

function leafFor(spec: Spec, seam: string): string {
  return path.posix.join("docs", "leaves", `${seam}.md`);
}

function statSize(dir: string, rel: string): number {
  return fs.statSync(path.join(dir, rel)).size;
}

function snapshot(dir: string): string {
  const out: Array<[string, number, string]> = [];
  const walk = (rel: string) => {
    const abs = path.join(dir, rel);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      for (const entry of fs.readdirSync(abs).sort()) walk(path.join(rel, entry));
    } else {
      out.push([rel, st.size, fs.readFileSync(abs, "utf8")]);
    }
  };
  walk(".");
  return JSON.stringify(out);
}

function spec(name: string): Spec {
  const raw = fs.readFileSync(
    path.join(ROOT, "skills/document-for-agents/tests/fixtures/orientation", `${name}.json`),
    "utf8",
  );
  const parsed = JSON.parse(raw) as Spec;
  return parsed;
}

const BANDS: Band[] = ["ordinary", "api-route", "schema-data", "re-orientation"];

describe("orientation resolver: resolved set (document-for-agents:INV-17)", () => {
  test("resolves index, whole leaves, leaf-named glossary entries, and linked accepted ADRs", () => {
    const fixture = spec("unrelated-additions");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha"],
      });
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/adr/0001-current-decision.md",
        "docs/leaves/alpha.md",
      ]);
      assert.equal(r.sourceCount, 4);
      assert.equal(r.over, false);
      // Glossary counts only the leaf-named entry, never the whole file.
      const context = statSize(dir, "CONTEXT.md");
      const wholeWithoutGlossary = ["ARCHITECTURE.md", "docs/leaves/alpha.md", "docs/adr/0001-current-decision.md"]
        .map((f) => statSize(dir, f))
        .reduce((a, b) => a + b, 0);
      assert.ok(r.bytes > wholeWithoutGlossary, "the named glossary entry must contribute bytes");
      assert.ok(r.bytes < wholeWithoutGlossary + context, "the whole glossary must not be counted");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("multi-seam resolution deduplicates shared sources", () => {
    const fixture = spec("duplicate-linked-sources");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha", "beta"],
      });
      assert.equal(r.sourceCount, 6);
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "REVIEW.md",
        "docs/adr/0001-current-decision.md",
        "docs/leaves/alpha.md",
        "docs/leaves/beta.md",
      ]);
      const wholeWithoutGlossary = [
        "ARCHITECTURE.md",
        "REVIEW.md",
        "docs/adr/0001-current-decision.md",
        "docs/leaves/alpha.md",
        "docs/leaves/beta.md",
      ].map((f) => statSize(dir, f)).reduce((a, b) => a + b, 0);
      assert.ok(r.bytes > wholeWithoutGlossary, "the shared glossary entry must contribute bytes once");
      assert.ok(
        r.bytes < wholeWithoutGlossary + statSize(dir, "CONTEXT.md"),
        "the shared entry must not pull the whole glossary in twice",
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("superseded ADRs stay out of current guidance unless the leaf explicitly requires them", () => {
    const fixture = spec("superseded-adr");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha"],
      });
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/adr/0001-current-decision.md",
        "docs/adr/0002-superseded-decision.md",
        "docs/adr/0003-current-decision.md",
        "docs/leaves/alpha.md",
      ]);
      // Default-exclusion half: stripping the exact `— requires.` clause
      // (leaving the bare bullet) keeps the superseded ADR out.
      fs.writeFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        fixture.files["docs/leaves/alpha.md"].replace(
          "- Decision: `docs/adr/0002-superseded-decision.md` — requires.",
          "- Decision: `docs/adr/0002-superseded-decision.md`.",
        ),
      );
      const without = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha"],
      });
      assert.equal(without.sources.includes("docs/adr/0002-superseded-decision.md"), false);
      // Negative half: the old free-text form `— requires the historical
      // context.` is no longer a required declaration.
      fs.writeFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        fixture.files["docs/leaves/alpha.md"].replace(
          "- Decision: `docs/adr/0002-superseded-decision.md` — requires.",
          "- Decision: `docs/adr/0002-superseded-decision.md` — requires the historical context.",
        ),
      );
      const freetext = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha"],
      });
      assert.equal(freetext.sources.includes("docs/adr/0002-superseded-decision.md"), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("re-orientation band drops ADR and policy links from the set", () => {
    const fixture = spec("duplicate-linked-sources");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({
        root: dir,
        band: "re-orientation",
        seams: ["alpha"],
      });
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/leaves/alpha.md",
      ]);
      assert.equal(r.cacheGap, false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unrelated seams, accepted ADRs, and large leaves leave an existing route unchanged", () => {
    const fixture = spec("unrelated-additions");
    const dir = build(fixture);
    try {
      const before = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      padFile(dir, leafFor(fixture, "gamma"), 40000);
      fs.appendFileSync(
        path.join(dir, "docs/leaves/gamma.md"),
        "\n- Decision: `docs/adr/0042-another-decision.md`.\n",
      );
      fs.writeFileSync(
        path.join(dir, "docs/adr/0042-another-decision.md"),
        "# 0042 — Another decision\n\nStatus: accepted\n\nDecision: shapes gamma only.\n",
      );
      const after = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      assert.deepEqual(after.sources, before.sources);
      assert.equal(after.bytes, before.bytes);
      // Current-decision selection: the unlinked accepted ADR never enters the set.
      assert.equal(after.sources.includes("docs/adr/0042-another-decision.md"), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the coverage manifest is exhaustive but excluded from every resolved set", () => {
    const fixture = spec("manifest-excluded");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/adr/0001-current-decision.md",
        "docs/leaves/alpha.md",
      ]);
      assert.equal(r.sources.includes("docs/manifest.md"), false);
      assert.equal(r.sourceCount, 4);
      assert.ok(fs.existsSync(path.join(dir, "docs/manifest.md")));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("only machine-required declarations load; compact decision and policy citations never load", () => {
    const fixture = spec("machine-required-forms");
    const dir = build(fixture);
    try {
      const r = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/adr/0002-required-decision.md",
        "docs/leaves/alpha.md",
        "docs/policies/testing.md",
      ]);
      // Compact citations (bare decision bullet, bare policy bullet, prose
      // mention) never enter the set.
      assert.equal(r.sources.includes("docs/adr/0001-accepted-decision.md"), false, "bare decision bullet is navigation only");
      assert.equal(r.sources.includes("REVIEW.md"), false, "bare policy bullet is navigation only");
      assert.equal(r.sources.includes("docs/adr/0003-rejected-decision.md"), false, "a rejected decision never enters, even when declared required");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the exact required clause: free text after `— requires.` is a compact citation", () => {
    const fixture = spec("machine-required-forms");
    const dir = build(fixture);
    try {
      // Text after the period (`— requires context.`) is prose, not the
      // declaration clause.
      fs.writeFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        fixture.files["docs/leaves/alpha.md"].replace(
          "- Decision: `docs/adr/0002-required-decision.md` — requires.",
          "- Decision: `docs/adr/0002-required-decision.md` — requires context.",
        ),
      );
      const contextual = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.equal(contextual.sources.includes("docs/adr/0002-required-decision.md"), false);
      // Extra trailing text after the clause period is equally navigation.
      fs.writeFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        fixture.files["docs/leaves/alpha.md"].replace(
          "- Decision: `docs/adr/0002-required-decision.md` — requires.",
          "- Decision: `docs/adr/0002-required-decision.md` — requires. (see also the historical notes)",
        ),
      );
      const trailing = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.equal(trailing.sources.includes("docs/adr/0002-required-decision.md"), false);
      // Trailing whitespace after the exact clause is tolerated.
      fs.writeFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        fixture.files["docs/leaves/alpha.md"].replace(
          "- Decision: `docs/adr/0002-required-decision.md` — requires.",
          "- Decision: `docs/adr/0002-required-decision.md` — requires. ",
        ),
      );
      const padded = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.equal(padded.sources.includes("docs/adr/0002-required-decision.md"), true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a bare decision bullet whose filename contains 'requires' never loads", () => {
    const fixture = spec("machine-required-forms");
    const dir = build(fixture);
    try {
      fs.writeFileSync(
        path.join(dir, "docs/adr/0004-requires-named-decision.md"),
        "# 0004 — Requires-named decision\n\nStatus: accepted\n\nDecision: the filename contains 'requires' but the bullet is bare.\n",
      );
      fs.appendFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        "\n- Decision: `docs/adr/0004-requires-named-decision.md`.\n",
      );
      const r = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.equal(r.sources.includes("docs/adr/0004-requires-named-decision.md"), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a `- Review policy:` bullet is ordinary navigation and never loads, even with the exact clause", () => {
    const fixture = spec("machine-required-forms");
    const dir = build(fixture);
    try {
      fs.appendFileSync(
        path.join(dir, "docs/leaves/alpha.md"),
        "\n- Review policy: `REVIEW.md` — requires.\n",
      );
      const r = resolveOrientation({
        root: dir,
        band: "api-route",
        seams: ["alpha"],
      });
      assert.equal(r.sources.includes("REVIEW.md"), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const c of [
    { name: "a missing Status line", line: "" },
    { name: "Status: draft", line: "Status: draft" },
    { name: "malformed status text", line: "Status: acccepted" },
  ]) {
    test(`a required decision with ${c.name} stays out of the set`, () => {
      const fixture = spec("machine-required-forms");
      const dir = build(fixture);
      try {
        fs.writeFileSync(
          path.join(dir, "docs/adr/0002-required-decision.md"),
          fixture.files["docs/adr/0002-required-decision.md"].replace(
            "Status: accepted\n",
            c.line === "" ? "" : `${c.line}\n`,
          ),
        );
        const r = resolveOrientation({
          root: dir,
          band: "api-route",
          seams: ["alpha"],
        });
        assert.equal(r.sources.includes("docs/adr/0002-required-decision.md"), false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  test("unknown affected seams fail cleanly and name the known seams", () => {
    const fixture = spec("unrelated-additions");
    const dir = build(fixture);
    try {
      assert.throws(
        () => resolveOrientation({ root: dir, band: "ordinary", seams: ["nope"] }),
        (err: unknown) => {
          assert.ok(err instanceof OrientationResolutionError);
          assert.match(err.message, /unknown affected seam 'nope'/);
          assert.match(err.message, /known seams: alpha/);
          return true;
        },
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolution is deterministic: repeated runs produce identical sets and bytes", () => {
    const fixture = spec("duplicate-linked-sources");
    const dir = build(fixture);
    try {
      const r1 = resolveOrientation({ root: dir, band: "api-route", seams: ["alpha", "beta"] });
      const r2 = resolveOrientation({ root: dir, band: "api-route", seams: ["alpha", "beta"] });
      assert.deepEqual(r2, r1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("orientation resolver: caps and boundary behavior (document-for-agents:INV-17)", () => {
  test("the published cap table is ordinary 6000, api-route 9000, schema-data 12000, re-orientation 7000, absolute 12000", () => {
    assert.deepEqual(CAPS, {
      ordinary: 6000,
      "api-route": 9000,
      "schema-data": 12000,
      "re-orientation": 7000,
    });
    assert.equal(ABSOLUTE_CAP, 12000);
    for (const band of BANDS) assert.ok(CAPS[band] <= ABSOLUTE_CAP);
  });

  for (const band of BANDS) {
    test(`every cap boundary: ${band} passes at exactly ${CAPS[band]} bytes and fails one byte above`, () => {
      const fixture = spec("unrelated-additions");
      const dir = build(fixture);
      try {
        const initial = resolveOrientation({ root: dir, band, seams: ["alpha"] });
        const cap = Math.min(CAPS[band], ABSOLUTE_CAP);
        assert.ok(initial.bytes < cap, "fixture base must sit under the cap");
        padFile(dir, leafFor(fixture, "alpha"), cap - initial.bytes);
        const exact = resolveOrientation({ root: dir, band, seams: ["alpha"] });
        assert.equal(exact.bytes, cap);
        assert.equal(exact.over, false, `${band} must fit exactly at the boundary`);
        padFile(dir, leafFor(fixture, "alpha"), 1);
        const over = resolveOrientation({ root: dir, band, seams: ["alpha"] });
        assert.equal(over.bytes, cap + 1);
        assert.equal(over.over, true, `${band} must fail one byte above the boundary`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  test("an oversized single leaf fails and reports band, bytes, cap, source count, and exact sources", () => {
    const fixture = spec("oversized-single-leaf");
    const dir = build(fixture);
    try {
      padFile(dir, leafFor(fixture, "alpha"), CAPS.ordinary + 1);
      const r = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      assert.equal(r.over, true);
      assert.equal(r.band, "ordinary");
      assert.equal(r.cap, 6000);
      assert.equal(r.bytes > r.cap, true);
      assert.equal(r.sourceCount, 4);
      assert.deepEqual(r.sources, [
        "ARCHITECTURE.md",
        "CONTEXT.md",
        "docs/adr/0001-current-decision.md",
        "docs/leaves/alpha.md",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an aggregate route fails when two fit-but-sums-exceed leaves resolve together", () => {
    const fixture = spec("oversized-aggregate-route");
    const dir = build(fixture);
    try {
      const initial = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
      });
      const cap = CAPS.ordinary;
      assert.ok(initial.bytes < cap);
      // Each leaf alone must fit its whole-leaf contribution…
      const alphaOnly = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      const betaOnly = resolveOrientation({ root: dir, band: "ordinary", seams: ["beta"] });
      assert.ok(alphaOnly.bytes <= cap && betaOnly.bytes <= cap);
      // …but the aggregate resolves over the cap.
      padFile(dir, leafFor(fixture, "beta"), cap - initial.bytes + 1);
      const r = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
      });
      assert.equal(r.over, true);
      assert.equal(r.bytes, cap + 1);
      assert.equal(r.sourceCount, 5);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cache-gap approval may substitute or narrow sources but never waives the cap", () => {
    const fixture = spec("oversized-aggregate-route");
    const dir = build(fixture);
    try {
      const initial = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
      });
      padFile(dir, leafFor(fixture, "beta"), CAPS.ordinary - initial.bytes + 1);
      const over = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
      });
      assert.equal(over.over, true);
      assert.equal(over.cacheGap, false);
      // Approved narrowing: drop the oversized beta leaf; cap still applies.
      const narrowed = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
        drop: ["docs/leaves/beta.md"],
      });
      assert.equal(narrowed.over, false);
      assert.equal(narrowed.cacheGap, true);
      assert.equal(narrowed.sources.includes("docs/leaves/beta.md"), false);
      // Approved substitution with new material still cannot waive the cap:
      // include a large file and the route fails again.
      const substituted = resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
        include: ["docs/leaves/beta.md"],
      });
      assert.equal(substituted.over, true);
      assert.equal(substituted.cap, 6000);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("orientation resolver: read-only guarantee (document-for-agents:INV-17)", () => {
  test("resolving the orientation set never mutates the repository, even on an over-budget failure", () => {
    const fixture = spec("oversized-aggregate-route");
    const dir = build(fixture);
    try {
      const before = snapshot(dir);
      resolveOrientation({
        root: dir,
        band: "ordinary",
        seams: ["alpha", "beta"],
      });
      const r = resolveOrientation({
        root: dir,
        band: "schema-data",
        seams: ["alpha", "beta"],
      });
      assert.equal(r.over, false);
      assert.throws(() =>
        resolveOrientation({ root: dir, band: "ordinary", seams: ["missing"] }),
      );
      const after = snapshot(dir);
      assert.equal(after, before);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("this repository's bounded doc migration (ticket #178)", () => {
  const SEAMS = [
    "document-for-agents",
    "document-for-humans",
    "unslopify",
    "plan-this",
    "implement-this",
    "review-this",
    "release-skills",
  ];
  const BANDS: Band[] = ["ordinary", "api-route", "schema-data", "re-orientation"];

  test("every declared route resolves within its strict cap", () => {
    for (const band of BANDS) {
      for (const seam of SEAMS) {
        const r = resolveOrientation({ root: ROOT, band, seams: [seam] });
        assert.equal(r.over, false, `${seam} ${band} route over budget: ${r.bytes} > ${r.cap}`);
        assert.equal(r.sources.includes("docs/manifest.md"), false, "manifest must stay out of every resolved set");
      }
    }
  });

  test("real seams resolve exact sources: prose citations stay navigation (AC-4)", () => {
    for (const seam of SEAMS) {
      for (const band of BANDS) {
        const r = resolveOrientation({ root: ROOT, band, seams: [seam] });
        // document-for-agents declares one explicit required source (the
        // Decision journal glossary entry); every other seam only
        // compact-cites.
        const expected = seam === "document-for-agents"
          ? ["ARCHITECTURE.md", "CONTEXT.md", `docs/leaves/${seam}.md`]
          : ["ARCHITECTURE.md", `docs/leaves/${seam}.md`];
        assert.deepEqual(r.sources, expected, `${seam} ${band} exact sources`);
        // The other real leaves only compact-cite their decisions, glossary,
        // and review policy in prose — none of that source content may load.
        if (seam !== "document-for-agents") {
          assert.equal(r.sources.includes("CONTEXT.md"), false, `${seam}: glossary stays a pointer`);
        }
        assert.equal(r.sources.includes("REVIEW.md"), false, `${seam}: review policy stays a pointer`);
        for (const f of r.sources) {
          assert.ok(
            f === "ARCHITECTURE.md" || f === "CONTEXT.md" || f === `docs/leaves/${seam}.md`,
            `${seam}: unexpected loaded source ${f}`,
          );
        }
        if (seam === "document-for-agents") {
          // The required source is the Decision journal BLOCK, not the whole
          // CONTEXT.md: the route exceeds index+leaf but stays far below
          // index+whole-glossary+leaf.
          const sizes = ["ARCHITECTURE.md", "CONTEXT.md", `docs/leaves/${seam}.md`]
            .map((f) => fs.statSync(path.join(ROOT, f)).size);
          const whole = sizes.reduce((a, b) => a + b, 0);
          const withoutGlossary = sizes[0] + sizes[2];
          assert.ok(r.bytes > withoutGlossary, "the Decision journal block must contribute bytes");
          assert.ok(r.bytes < whole, "only the named Decision journal block loads, never the whole glossary");
        }
      }
    }
  });

  test("this repository's own leaf confirms required-source exclusivity (AC-4)", () => {
    // The owning leaf declares exactly one required source — the Decision
    // journal glossary entry — and cites ADR-0024 and ADR-0025 among many in
    // prose; none of them are marked `— requires.`, so the live route must
    // load index + glossary block + leaf and no ADR or policy.
    for (const band of BANDS) {
      const r = resolveOrientation({ root: ROOT, band, seams: ["document-for-agents"] });
      assert.equal(r.sources.length, 3, `${band}: index + Decision journal + leaf only`);
      assert.deepEqual(r.sources, ["ARCHITECTURE.md", "CONTEXT.md", "docs/leaves/document-for-agents.md"]);
      assert.ok(r.sources.every((f) => !f.startsWith("docs/adr/")), `${band}: no ADR loads`);
      assert.equal(r.sources.includes("REVIEW.md"), false, `${band}: review policy stays a pointer`);
    }
  });

  test("escalating bands never pull bare policy mentions into the set (AC-4)", () => {
    for (const seam of ["document-for-agents", "implement-this", "plan-this"]) {
      const ordinary = resolveOrientation({ root: ROOT, band: "ordinary", seams: [seam] });
      const route = resolveOrientation({ root: ROOT, band: "api-route", seams: [seam] });
      const data = resolveOrientation({ root: ROOT, band: "schema-data", seams: [seam] });
      assert.deepEqual(route.sources, ordinary.sources,
        `${seam}: api-route must not add policy sources that the leaf never declares`);
      assert.deepEqual(data.sources, ordinary.sources,
        `${seam}: schema-data must not add policy sources that the leaf never declares`);
    }
  });

  test("adding unrelated docs in a scale fixture leaves an existing seam's resolved set and bytes unchanged", () => {
    const fixture = spec("unrelated-additions");
    const dir = build(fixture);
    try {
      const before = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      padFile(dir, leafFor(fixture, "gamma"), 20000);
      fs.appendFileSync(
        path.join(dir, "docs/leaves/gamma.md"),
        "\n- Decision: `docs/adr/0043-scaled-decision.md`.\n",
      );
      fs.writeFileSync(
        path.join(dir, "docs/adr/0043-scaled-decision.md"),
        "# 0043 — Scaled decision\n\nStatus: accepted\n\nDecision: shapes gamma only.\n",
      );
      fs.writeFileSync(path.join(dir, "docs/unrelated-scaled-doc.md"), "# Unrelated\n\nGrowth only.\n");
      const after = resolveOrientation({ root: dir, band: "ordinary", seams: ["alpha"] });
      assert.deepEqual(after.sources, before.sources);
      assert.equal(after.bytes, before.bytes);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});