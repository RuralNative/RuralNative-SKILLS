// document-for-agents governance — the deterministic tier governor, seam
// fingerprint, and diagnostics-consent core (ADR-0028). Pure classification
// lives here so lifecycle branches reach the same decision from the same
// evidence; filesystem enumeration and hashing back the CLI and the harness
// mirror in `scripts/docs-check.sh`.
//
// Tier model: ordered minimal < standard < full. Promotion is monotonic and
// additive — resolvePromotion never lowers a tier, so a growing repository
// gains artifacts inside the run that observes the evidence and a shrinking one
// never loses them automatically.
//
// Seam fingerprint: a canonical SHA-256 over a seam's VCS-visible code root
// (tracked plus non-ignored untracked files). Each file contributes
// `path<TAB>type<TAB>size<TAB>contentHash`, entries sort by path, each line is
// followed by a newline, and the joined preimage is hashed. type is `f`
// (regular file, content hash of its bytes), `l` (symlink, hash of its target),
// `g` (gitlink/other present-but-not-regular), or `d` (listed but absent). The
// algorithm is byte-for-byte the one `scripts/docs-check.sh` check 2 recomputes,
// so the stored manifest digest and the live digest agree. Fingerprints are
// manifest metadata, never orientation-set inputs (ADR-0024, ADR-0025).
// A root outside a git work tree fails closed: enumeration reports
// `notAGitRepo` and `fingerprintSeam` returns `null` rather than the empty
// preimage, so an untrustworthy digest is never mistaken for an empty seam
// (ADR-0028).
//
// Consent model: absent or corrupt state asks again and creates nothing; only
// `enabled` may write the private log; `declined` stays silent. No network, no
// upload — ADR-0018 privacy survives ADR-0028's remembered-choice narrowing.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export type Tier = "minimal" | "standard" | "full";

export const TIERS: readonly Tier[] = ["minimal", "standard", "full"];

export function tierRank(tier: Tier): number {
  return TIERS.indexOf(tier);
}

// Evidence the preflight gathers from the repository. Each flag names one
// settled trigger; `confirmedDrift` means a review proved a false claim, not a
// mere fingerprint mismatch.
export type TierEvidence = Readonly<{
  durableDecision?: boolean;
  multipleSeams?: boolean;
  confirmedDrift?: boolean;
  coordinationNeed?: boolean;
  generatedDocNeed?: boolean;
}>;

// The tier the evidence demands, ignoring the current tier.
export function requiredTier(e: TierEvidence): Tier {
  if (e.confirmedDrift || e.coordinationNeed || e.generatedDocNeed) return "full";
  if (e.durableDecision || e.multipleSeams) return "standard";
  return "minimal";
}

export type Promotion = Readonly<{
  current: Tier;
  effective: Tier;
  promoted: boolean;
  additive: true;
}>;

// Monotonic promotion: the effective tier never ranks below the current one, so
// a run that observes growth raises the tier and a run that observes none leaves
// it. Promotion is always additive (INV-18): demotion requires an explicit
// approved Improve, never this function.
export function resolvePromotion(current: Tier, e: TierEvidence): Promotion {
  const wanted = requiredTier(e);
  const promoted = tierRank(wanted) > tierRank(current);
  return {
    current,
    effective: promoted ? wanted : current,
    promoted,
    additive: true,
  };
}

export type EntryType = "f" | "l" | "g" | "d";

export type Entry = Readonly<{
  path: string;
  type: EntryType;
  size: number;
  hash: string;
}>;

function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function entryLine(e: Entry): string {
  return `${e.path}\t${e.type}\t${e.size}\t${e.hash}`;
}

function comparePath(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

// The canonical seam digest. Deterministic: the same entries always hash the
// same, and any change to a file's bytes, name, presence, or type changes it.
export function seamFingerprint(entries: readonly Entry[]): string {
  const sorted = [...entries].sort((a, b) => comparePath(a.path, b.path));
  const preimage = sorted.map((e) => entryLine(e) + "\n").join("");
  return "sha256:" + sha256(Buffer.from(preimage, "utf8"));
}

// Fail-closed enumation for the seam fingerprint (ADR-0028): a fingerprint is
// trustworthy only when it enumerates a real git work tree. `notAGitRepo`
// distinguishes "enumerated and empty" from "could not enumerate", so a caller
// can refuse to trust the empty preimage instead of silently matching it.
export type EnumerationResult = Readonly<{
  notAGitRepo: boolean;
  entries: Entry[];
}>;

function gitLines(root: string, args: string[]): string[] | null {
  try {
    const out = execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    // Strip only the line terminator; a tracked name may legitimately start or
    // end with whitespace, and trimming it would corrupt the path (INV-20).
    // Drop only the single trailing empty field from the final newline.
    const lines = out.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    return lines;
  } catch {
    return null;
  }
}

// Enumerate a seam code root's VCS-visible files (tracked plus non-ignored
// untracked), matching check 2's `git ls-files -c` and `-o --exclude-standard`
// pair. Paths are relative to the repository root. When the root is not inside
// a git work tree the result is `{ notAGitRepo: true, entries: [] }` so callers
// fail closed instead of trusting the empty preimage.
export function enumerateSeamEntries(root: string, codeRootRel: string): EnumerationResult {
  const tracked = gitLines(root, ["ls-files", "-c", "--", codeRootRel]);
  const untracked = gitLines(root, ["ls-files", "-o", "--exclude-standard", "--", codeRootRel]);
  if (tracked === null || untracked === null) return { notAGitRepo: true, entries: [] };
  const paths = [...new Set([...tracked, ...untracked])].sort(comparePath);
  const entries = paths.map((rel): Entry => {
    const abs = path.join(root, rel);
    let st: fs.Stats | null = null;
    try {
      st = fs.lstatSync(abs);
    } catch {
      st = null;
    }
    if (st && st.isSymbolicLink()) {
      const target = fs.readlinkSync(abs);
      return { path: rel, type: "l", size: Buffer.byteLength(target, "utf8"), hash: sha256(target) };
    }
    if (st && st.isFile()) {
      const bytes = fs.readFileSync(abs);
      return { path: rel, type: "f", size: bytes.length, hash: sha256(bytes) };
    }
    if (st) {
      return { path: rel, type: "g", size: 0, hash: sha256("") };
    }
    return { path: rel, type: "d", size: 0, hash: sha256("") };
  });
  return { notAGitRepo: false, entries };
}

// A trustworthy seam digest, or `null` when the root is not enumerable.
export function fingerprintSeam(root: string, codeRootRel: string): string | null {
  const r = enumerateSeamEntries(root, codeRootRel);
  return r.notAGitRepo ? null : seamFingerprint(r.entries);
}

export type ConsentState = "absent" | "enabled" | "declined" | "corrupt";

export type DiagnosticsAction = Readonly<{
  ask: boolean;
  createLogFile: boolean;
  writeLog: boolean;
}>;

// Consent is an unavoidable first-run checkpoint: absent or corrupt state asks
// again and creates nothing. Only an explicit `enabled` state may write; a
// declined or unpersisted state never infers consent (INV-14, ADR-0028).
export function nextDiagnosticsAction(state: ConsentState): DiagnosticsAction {
  if (state === "enabled") return { ask: false, createLogFile: false, writeLog: true };
  if (state === "declined") return { ask: false, createLogFile: false, writeLog: false };
  return { ask: true, createLogFile: false, writeLog: false };
}

function parseArgs(argv: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const value = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args.set(key, value);
  }
  return args;
}

export function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "fingerprint") {
    const root = args.get("root") ?? process.cwd();
    const codeRoot = args.get("seam-root");
    if (!codeRoot) {
      console.error("error: fingerprint requires --seam-root <code-root-rel>");
      return 2;
    }
    const fp = fingerprintSeam(root, codeRoot);
    if (fp === null) {
      console.error("error: cannot compute a trustworthy seam fingerprint — not a git work tree (ADR-0028 fail-closed)");
      return 1;
    }
    console.log(fp);
    return 0;
  }
  if (command === "tier") {
    const current = (args.get("current") ?? "minimal") as Tier;
    if (!TIERS.includes(current)) {
      console.error("error: --current must be minimal | standard | full");
      return 2;
    }
    const evidence: TierEvidence = {
      durableDecision: args.get("durable-decision") === "true",
      multipleSeams: args.get("multiple-seams") === "true",
      confirmedDrift: args.get("confirmed-drift") === "true",
      coordinationNeed: args.get("coordination-need") === "true",
      generatedDocNeed: args.get("generated-doc-need") === "true",
    };
    const p = resolvePromotion(current, evidence);
    console.log(`current: ${p.current}`);
    console.log(`effective: ${p.effective}`);
    console.log(`promoted: ${p.promoted}`);
    return 0;
  }
  if (command === "consent") {
    const state = (args.get("state") ?? "absent") as ConsentState;
    const a = nextDiagnosticsAction(state);
    console.log(`ask: ${a.ask}`);
    console.log(`writeLog: ${a.writeLog}`);
    return 0;
  }
  console.error("error: command must be fingerprint | tier | consent");
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}
