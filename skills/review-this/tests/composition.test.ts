// review-this:INV-1 — identity == folder
// review-this:INV-2 — registry-lane install, manual copy, and explicit invocation
// review-this:INV-3 — fixed-template boundary preserves the exact review prefix and a single ## Fixed point: slot
// review-this:INV-4 — hard dependencies /code-review and /unslopify in order with unslopify contracts and focused doc-cache route
// review-this:INV-5 — invocation semantics: fixed-point kinds, ask-and-stop on missing fixed point
// review-this:INV-6 — one review contract: spec source order, smell baseline override, no merge or rerank across axes
// review-this:INV-7 — parallel sub-agent spawning and side-by-side aggregation
// review-this:INV-8 — index coherence in ARCHITECTURE.md and leaf doc
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");
function read(p: string): string {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}
function norm(s: string): string {
  return s.replace(/\s+/g, " ").toLowerCase();
}
function getBody(skill: string): string {
  const m = skill.match(/^---\n[\s\S]*?\n---\n/);
  if (!m) return skill;
  return skill.slice(m[0].length);
}

describe("review-this identity (review-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly review-this", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("name: review-this"), "frontmatter name must be exactly review-this");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/review-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/review-this/INSTALL.md")));
    const match = skill.match(/name:\s*review-this/);
    assert.ok(match, "frontmatter name must match folder review-this");
  });

  test("does not modify sibling seams or delegated repository-owned skills", () => {
    const unslopify = read("skills/unslopify/SKILL.md");
    assert.equal(unslopify.includes("review-this"), false, "unslopify must not be modified to mention review-this");
    const planThis = read("skills/plan-this/SKILL.md");
    assert.ok(planThis.includes("name: plan-this"));
  });
});

describe("review-this discovery and installation (review-this:INV-2)", () => {
  test("description declares explicit invocation /review-this <fixed-point>", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("/review-this <fixed-point>"), "description must declare explicit invocation /review-this <fixed-point>");
  });

  test("registry-lane install guidance present with exact command and manual copy", () => {
    const install = read("skills/review-this/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill review-this"));
    assert.ok(install.includes("cp -r skills/review-this"));
    const skill = read("skills/review-this/SKILL.md");
    assert.equal(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill review-this"), false, "trimmed SKILL.md must not duplicate install command");
  });

  test("architecture index and leaf doc describe the new seam (review-this:INV-8)", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("review-this"), "ARCHITECTURE seam table must list review-this");
    assert.ok(arch.includes("skills/review-this/"));
    assert.ok(arch.includes("docs/leaves/review-this.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/review-this.md")));
    const leaf = read("docs/leaves/review-this.md");
    for (let i = 1; i <= 8; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
  });
});

describe("review-this fixed template and fixed-point substitution (review-this:INV-3)", () => {
  test("preserves exact review prefix and substitutes only the fixed point under ## Fixed point:", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("Review the changes since a fixed point: `/code-review`"));
    assert.ok(body.includes("## Rules"));
    assert.ok(body.trimEnd().endsWith("## Fixed point:"), "body must end with ## Fixed point: slot");
    // single slot hosting only the fixed-point text
    const slotCount = (body.match(/## Fixed point:/g) || []).length;
    assert.equal(slotCount, 1, "body must contain ## Fixed point: exactly once");
    const slotBody = body.slice(body.indexOf("## Fixed point:") + "## Fixed point:".length).trim();
    assert.equal(slotBody, "", "slot must host only the substituted fixed-point text, nothing else");
    // simulate invoking /review-this main
    const emitted = body.trimEnd() + "\n" + "main" + "\n";
    assert.ok(emitted.includes("## Fixed point:\nmain"));
    // simulate invoking /review-this HEAD~5
    const emitted2 = body.trimEnd() + "\n" + "HEAD~5" + "\n";
    assert.ok(emitted2.includes("## Fixed point:\nHEAD~5"));
  });

  test("body after frontmatter equals expected review prefix verbatim", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    const expected = `
Review the changes since a fixed point: \`/code-review\`

\`/code-review\` carries no \`disable-model-invocation\` lock and remains model-invocable.

## Rules

- Load \`/unslopify\` before the first progress update. Keep it active throughout the review, both sub-agent reports, issue comments, and the final summary. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning. Follow unslopify scope, protected-content, preservation, and completion report contracts.
- Follow \`/code-review\` as the procedural source of truth.
- Pin the fixed point before spawning anything: capture \`git diff <fixed-point>...HEAD\` (three-dot, against the merge-base) and \`git log <fixed-point>..HEAD --oneline\`; confirm \`git rev-parse <fixed-point>\` resolves and the diff is non-empty. A bad ref or empty diff fails here, not inside the sub-agents.
- Identify the spec source in this order: issue references in the commit messages, a path the caller supplied, then a spec file under \`docs/\`, \`specs/\`, or \`.scratch/\` matching the branch; if nothing is found ask, and skip the Spec axis with "no spec available" when the caller says there isn't one.
- Standards sources are whatever documents how code should be written plus the smell baseline; a documented repo standard overrides the baseline, and every baseline smell stays a labelled judgement call.
- Spawn the Standards and Spec sub-agents in parallel so their contexts stay separate, then aggregate both reports side by side under \`## Standards\` and \`## Spec\`, verbatim or lightly cleaned. Never merge or rerank findings across axes.
- Use focused doc-cache loading: read AGENTS.md, ARCHITECTURE.md, the affected seam leaf doc in docs/leaves/, CONTEXT.md, and relevant ADRs. This focused route does not require broad preloading and does not require the derived human docs from document-for-humans (docs/human/).
- If no fixed point was supplied, ask for one and stop until it arrives.

## Fixed point:
`;
    assert.equal(body.trim(), expected.trim(), "body after frontmatter must equal expected review prefix verbatim");
  });

  test("trimmed shape rejects wrapper phrases and respects line-count bound", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.equal(skill.includes("Rules preserved"), false, "must not contain Rules preserved");
    assert.equal(skill.includes("## Installation"), false, "must not contain ## Installation");
    assert.equal(skill.includes("## Boundary"), false, "must not contain ## Boundary");
    assert.equal(body.includes("## Invocation"), false, "body must not contain ## Invocation");
    assert.equal(body.includes("## Hard dependencies"), false, "body must not contain ## Hard dependencies wrapper");
    assert.equal(body.includes("Issue #0"), false, "review-this must not contain implementation placeholder Issue #0");
    // line-count bound: 18-35 lines total including frontmatter
    const lines = skill.trimEnd().split("\n").length;
    assert.ok(lines >= 18 && lines <= 35, `line count ${lines} must be within 18-35`);
  });

  test("preserves exact protected identifiers and does not add extra machinery", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("`/unslopify`"));
    const files = fs.readdirSync(path.join(ROOT, "skills/review-this"));
    assert.ok(!files.includes("scripts"), "must not add scripts directory");
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/review-this/package.json")), "no npm package");
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/review-this.md")), "must not add .kilo command file");
  });
});

describe("review-this hard dependencies and workflow order (review-this:INV-4)", () => {
  test("declares /code-review and /unslopify in order with unslopify before first progress update", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslopify"));
    assert.ok(n.includes("/code-review"));
    assert.ok(n.includes("before the first progress update"));
    const idxReview = skill.indexOf("/code-review");
    const idxUnslopify = skill.indexOf("/unslopify");
    assert.ok(idxReview !== -1 && idxUnslopify !== -1 && idxReview < idxUnslopify, "workflow must name /code-review before /unslopify loads");
    // frontmatter description also declares both dependencies
    const frontmatter = skill.slice(0, skill.indexOf("---", 3) + 3);
    assert.ok(frontmatter.includes("/code-review") && frontmatter.includes("/unslopify"), "frontmatter must declare both hard dependencies");
    // unslopify contracts
    assert.ok(n.includes("protected-content") || n.includes("protected content"), "must name protected-content contract");
    assert.ok(n.includes("preservation"), "must name preservation contract");
    assert.ok(n.includes("completion report"), "must require completion report");
    assert.ok(n.includes("scope"), "must name scope contract");
  });

  test("code-review stays model-invocable and focused doc-cache route excludes derived human docs", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("no `disable-model-invocation` lock") || n.includes("disable-model-invocation"), "must state the invocation-lock status of /code-review");
    assert.ok(n.includes("model-invocable"), "must state /code-review remains model-invocable");
    assert.ok(skill.includes("AGENTS.md"));
    assert.ok(skill.includes("ARCHITECTURE.md"));
    assert.ok(skill.includes("CONTEXT.md"));
    assert.ok(skill.includes("docs/leaves/") || n.includes("seam leaf"));
    assert.ok(n.includes("adr"));
    assert.ok(n.includes("document-for-humans") || n.includes("human docs"), "must exclude derived human docs");
    assert.equal(n.includes("preload all docs") || n.includes("read all documentation"), false, "must not require broad preload");
  });
});

describe("review-this invocation semantics (review-this:INV-5)", () => {
  test("accepts commit SHA, branch, tag, or merge-base expression as fixed point", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("commit sha"), "must accept a commit SHA");
    assert.ok(n.includes("branch"), "must accept a branch");
    assert.ok(n.includes("tag"), "must accept a tag");
    assert.ok(n.includes("merge-base"), "must accept a merge-base expression");
  });

  test("missing fixed point asks and stops", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("ask"), "must ask for a missing fixed point");
    assert.ok(n.includes("stop"), "must stop until it arrives");
    assert.equal((getBody(skill).match(/## Fixed point:/g) || []).length, 1, "exactly one ask-and-stop slot");
  });

  test("no ticket number required; issue reference may serve as spec source", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("no ticket number is required"), "must state no ticket number is required");
    assert.ok(n.includes("issue reference may be supplied as the spec source") || n.includes("issue references in the commit messages"), "issue reference may serve as spec source");
  });
});

describe("review-this one review contract (review-this:INV-6)", () => {
  test("pins spec source order matching /code-review", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    const idxCommitRefs = body.indexOf("issue references in the commit messages");
    const idxCallerPath = body.indexOf("a path the caller supplied");
    const idxFileMatch = body.indexOf("matching the branch");
    assert.ok(idxCommitRefs !== -1 && idxCallerPath !== -1 && idxFileMatch !== -1);
    assert.ok(idxCommitRefs < idxCallerPath && idxCallerPath < idxFileMatch, "spec source order must be commit refs -> caller path -> file match");
    assert.ok(body.includes('"no spec available"'), "must skip the Spec axis with no spec available");
  });

  test("smell baseline applies unless a documented repo standard overrides it", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("smell baseline"));
    assert.ok(body.includes("a documented repo standard overrides the baseline"));
    assert.ok(body.includes("labelled judgement call"));
  });

  test("reports axes side by side without merging or reranking", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const leaf = read("docs/leaves/review-this.md");
    const n = norm(`${skill}\n${install}\n${leaf}`);
    assert.ok(n.includes("never merge or rerank"), "must forbid merging or reranking findings across axes");
    assert.ok(n.includes("side by side"), "must report side by side");
    assert.ok(skill.includes("`## Standards`") && skill.includes("`## Spec`"));
  });
});

describe("review-this parallel sub-agent spawning (review-this:INV-7)", () => {
  test("spawns Standards and Spec sub-agents in parallel with separate contexts", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("Spawn the Standards and Spec sub-agents in parallel"));
    assert.ok(body.includes("their contexts stay separate"));
    assert.ok(body.includes("aggregate both reports side by side"));
  });
});
