import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const readme = fs.readFileSync("README.md", "utf8");
describe("README contract", () => {
  it("has required headings in order", () => {
    const headings = [...readme.matchAll(/^##\s+(.+)$/gm)].map(m => m[1].trim());
    const required = ["Installation","Technical Requirements","Our Shelf","Motivation and Purpose","Philosophy","Which skill and when","AI-First Workflow Integration","Comparative Analysis","Critical Evaluation","Future Roadmap"];
    let last=-1;
    for(const r of required){ const idx=headings.findIndex((h,i)=>i>last&&h===r); assert.notEqual(idx,-1,`missing heading: ${r} order: ${headings.join(" | ")}`); last=idx; }
  });
  it("shelf has exactly three rows", () => {
    const shelf = readme.split("## Our Shelf")[1]?.split(/^##\s/m)[0] ?? "";
    const rows=[...shelf.matchAll(/^\|\s*\*\*.*?\*\*/gm)];
    assert.equal(rows.length,3);
  });
  it("installation has exactly three npx commands in dependency order", () => {
    const sec = readme.split("## Installation")[1]?.split(/^##\s/m)[0] ?? "";
    const codeBlock = [...sec.matchAll(/```bash([\s\S]*?)```/g)].map(m=>m[1]).join("\n");
    const cmds=[...codeBlock.matchAll(/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(cmds,["unslopify","document-for-agents","document-for-humans"]);
  });
  it("captures focused doc-cache purpose", () => {
    assert.match(readme,/codebase cache for the unrecoverable where-and-why context/i);
    assert.match(readme,/focused loading instead of reading all docs before acting/i);
  });
});
