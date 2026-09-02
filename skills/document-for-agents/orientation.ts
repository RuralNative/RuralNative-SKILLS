// Runtime orientation resolver — document-for-agents orientation budget
// (ADR-0024, ADR-0025). Computes the unique, deduplicated orientation set a
// task requires before code inspection: the compact architecture index, whole
// affected seam leaf docs, leaf-named glossary entries, and explicitly
// required decisions or policies. Machine-required declarations enter the
// set; compact citations are visible navigation only and never load source
// content. One machine-readable declaration form per category:
//
//   - Required glossary term: `- Glossary: CONTEXT.md — Alpha term.`
//   - Required decision:      `- Decision: docs/adr/000N-....md — requires.`
//   - Required policy:        `- Policy: docs/policies/testing.md — requires.`
//
// A bare `- Decision:` or `- Policy:` link (or a prose mention) stays
// navigation. A decision loads only when its `Status:` line value is exactly
// `accepted` or `superseded` — the exact-token rule: no prefix junk before the
// token and no trailing text after it ("Status: accepted-ish" or "Status:
// accepted extra" never match). Missing, draft, malformed, and rejected
// statuses never load, even when a leaf declares them required. Counts UTF-8
// bytes before any broad loading;
// over-budget routes fail and report band, resolved bytes, cap, source count,
// and exact sources. Deterministic: resolution is a pure function of the
// repository.
//
// The harness-owned coverage manifest (docs/manifest.md) is never part of a
// resolved set. Cache-gap approval can substitute or narrow sources through
// --include / --drop but can never waive the cap.
import fs from "node:fs";
import path from "node:path";

export type Band = "ordinary" | "api-route" | "schema-data" | "re-orientation";

export const CAPS: Record<Band, number> = {
  ordinary: 9000,
  "api-route": 13500,
  "schema-data": 18000,
  "re-orientation": 10500,
};

// No orientation set exceeds this absolute cap.
export const ABSOLUTE_CAP = 18000;

export type ResolveOptions = Readonly<{
  root: string;
  band: Band;
  seams: readonly string[];
  include?: readonly string[];
  drop?: readonly string[];
  verbose?: boolean;
}>;

export type Resolved = Readonly<{
  band: Band;
  cap: number;
  bytes: number;
  sourceCount: number;
  sources: readonly string[];
  cacheGap: boolean;
  over: boolean;
}>;

export class OrientationResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrientationResolutionError";
  }
}

const SEAM_ROW = /^\|\s*([a-z0-9-]+)\s*\|/;
const TERM_BLOCK = /^\*\*(.+)\*\*:/;
const GLOSSARY_LINK = /^-\s+Glossary:\s*`([^`]+)`(?:\s*—\s*(.+))?$/i;
const DOC_LINK = /^-\s+(Decision|Policy):\s*`([^`]+\.md)`/i;
// The exact required clause: the line must end with `— requires.` (trailing
// whitespace tolerated). Any text after the period — free prose, another
// sentence — makes the line a compact citation. A filename containing
// "requires" is irrelevant.
const REQUIRES_CLAUSE = /—\s*requires\.\s*$/;

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function listSeams(indexContent: string): Map<string, string> {
  const seams = new Map<string, string>();
  for (const line of indexContent.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const name = cells[1];
    const doc = cells[cells.length - 2];
    if (/^[a-z0-9-]+$/.test(name) && /^docs\/.+\.md$/.test(doc)) {
      seams.set(name, doc);
    }
  }
  return seams;
}

function glossaryBlocks(glossaryContent: string): Map<string, string> {
  const blocks = new Map<string, string>();
  let currentKey: string | null = null;
  const buffer: string[] = [];
  const flush = () => {
    if (currentKey) blocks.set(currentKey, buffer.join("\n"));
    buffer.length = 0;
  };
  for (const line of glossaryContent.split("\n")) {
    const m = line.match(TERM_BLOCK);
    if (m) {
      flush();
      currentKey = normalizeKey(m[1]);
    }
    if (currentKey) buffer.push(line);
  }
  flush();
  return blocks;
}

interface Contribution {
  file: string;
  bytes: number;
  key: string;
}

function contributionOf(
  root: string,
  rel: string,
): { bytes: number; content: string } {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    throw new OrientationResolutionError(`resolved source missing on disk: ${rel}`);
  }
  const content = fs.readFileSync(abs, "utf8");
  return { bytes: Buffer.byteLength(content, "utf8"), content };
}

function leafLinks(leafContent: string) {
  const glossaryLinks: Array<{ file: string; terms: string[] }> = [];
  const decisionLinks: Array<{ file: string; requires: boolean }> = [];
  const policyLinks: Array<{ file: string; requires: boolean }> = [];
  for (const line of leafContent.split("\n")) {
    const g = line.match(GLOSSARY_LINK);
    if (g) {
      const terms = (g[2] ?? "")
        .split(",")
        .map((t) => t.trim().replace(/\.$/, ""))
        .filter(Boolean);
      glossaryLinks.push({ file: g[1], terms });
      continue;
    }
    const d = line.match(DOC_LINK);
    if (d) {
      const file = d[2];
      if (/^Decision/i.test(d[1])) {
        decisionLinks.push({ file, requires: REQUIRES_CLAUSE.test(line) });
      } else {
        policyLinks.push({ file, requires: REQUIRES_CLAUSE.test(line) });
      }
    }
  }
  return { glossaryLinks, decisionLinks, policyLinks };
}

// document-for-agents:INV-17 — resolve the deterministic orientation set.
export function resolveOrientation(opts: ResolveOptions): Resolved {
  const root = opts.root;
  const indexRel = "ARCHITECTURE.md";
  let indexContent: string;
  try {
    indexContent = fs.readFileSync(path.join(root, indexRel), "utf8");
  } catch {
    throw new OrientationResolutionError(
      `no compact architecture index found at ${indexRel} in ${root}`,
    );
  }
  const seams = listSeams(indexContent);
  const contributions = new Map<string, Contribution>();
  const addWhole = (rel: string) => {
    const { bytes } = contributionOf(root, rel);
    contributions.set(rel, { file: rel, bytes, key: `whole:${rel}` });
  };
  const addBlock = (rel: string, blockKey: string, blockText: string) => {
    const key = `block:${rel}:${blockKey}`;
    if (contributions.has(key)) return;
    contributions.set(key, {
      file: rel,
      bytes: Buffer.byteLength(blockText, "utf8"),
      key,
    });
  };

  addWhole(indexRel);

  const includeAdrs = opts.band !== "re-orientation";
  const includePolicies = opts.band === "api-route" || opts.band === "schema-data";

  for (const seam of opts.seams) {
    const leaf = seams.get(seam);
    if (!leaf) {
      throw new OrientationResolutionError(
        `unknown affected seam '${seam}'; known seams: ${[...seams.keys()].sort().join(", ") || "none"}`,
      );
    }
    const { content: leafContent } = contributionOf(root, leaf);
    addWhole(leaf);
    const { glossaryLinks, decisionLinks, policyLinks } = leafLinks(leafContent);

    for (const g of glossaryLinks) {
      const glossaryContent = fs.readFileSync(
        path.join(root, g.file),
        "utf8",
      );
      const blocks = glossaryBlocks(glossaryContent);
      for (const term of g.terms) {
        const block = blocks.get(normalizeKey(term));
        if (block) addBlock(g.file, normalizeKey(term), block);
      }
    }

    if (includeAdrs) {
      for (const decision of decisionLinks) {
        // A compact citation (no explicit required marker) is navigation
        // only: it never loads the decision's source content.
        if (!decision.requires) continue;
        const { content } = contributionOf(root, decision.file);
        // Exact-token, fail-closed boundary: the Status line value must be
        // exactly accepted | superseded | rejected — no prefix junk and no
        // trailing text after the token ("Status: accepted-ish" or "Status:
        // accepted extra" never match).
        const status = /^Status:\s*(accepted|superseded|rejected)\s*$/m.exec(
          content,
        )?.[1];
        // Only a parseable accepted or superseded status joins the set;
        // missing, draft, malformed, and rejected statuses never load.
        if (status !== "accepted" && status !== "superseded") continue;
        addWhole(decision.file);
      }
    }

    if (includePolicies) {
      for (const policy of policyLinks) {
        // Same citation/declaration split: only an explicitly required policy
        // enters the set; a bare policy link is navigation.
        if (!policy.requires) continue;
        addWhole(policy.file);
      }
    }
  }

  const includes = opts.include ?? [];
  const drops = opts.drop ?? [];
  for (const rel of includes) addWhole(rel);

  let files = [...contributions.values()]
    .filter((c) => !drops.includes(c.file))
    .reduce((acc, c) => {
      const prev = acc.get(c.file);
      const bytes = (prev ?? 0) + c.bytes;
      acc.set(c.file, bytes);
      return acc;
    }, new Map<string, number>());

  const sources = [...files.keys()].sort();
  const bytes = sources.reduce((sum, f) => sum + (files.get(f) ?? 0), 0);
  const cap = Math.min(CAPS[opts.band], ABSOLUTE_CAP);
  return {
    band: opts.band,
    cap,
    bytes,
    sourceCount: sources.length,
    sources,
    cacheGap: includes.length > 0 || drops.length > 0,
    over: bytes > cap,
  };
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function main(argv: string[]): number {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const value = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args.set(key, value);
  }
  const root = args.get("root") ?? process.cwd();
  const band = args.get("band") as Band | undefined;
  if (!band || !(band in CAPS)) {
    console.error("error: --band must be ordinary | api-route | schema-data | re-orientation");
    return 2;
  }
  const seams = parseList(args.get("seams"));
  if (seams.length === 0) {
    console.error("error: --seams expects at least one affected seam name");
    return 2;
  }
  const include = parseList(args.get("include"));
  const drop = parseList(args.get("drop"));
  const verbose = args.get("verbose") === "true";

  let resolved: Resolved;
  try {
    resolved = resolveOrientation({ root, band, seams, include, drop });
  } catch (err) {
    const e = err as Error;
    console.error(`error: ${e.message}`);
    return 2;
  }

  console.log(`band: ${resolved.band}`);
  console.log(`cap: ${resolved.cap}`);
  console.log(`bytes: ${resolved.bytes}`);
  console.log(`sources: ${resolved.sourceCount}`);
  if (resolved.over) {
    console.log(`result: over budget`);
    console.log(`task band: ${resolved.band}`);
    console.log(`resolved bytes: ${resolved.bytes}`);
    console.log(`cap: ${resolved.cap}`);
    console.log(`source count: ${resolved.sourceCount}`);
  }
  if (resolved.sources.length > 0 && (resolved.over || resolved.cacheGap || verbose)) {
    for (const s of resolved.sources) console.log(`source: ${s}`);
  }
  return resolved.over ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}