import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const readme = fs.readFileSync(path.join(ROOT,"README.md"),"utf8");
function headings(m:string){ return [...m.matchAll(/^#{1,3}\s+(.+)$/gm)].map(x=>x[1].trim()); }

describe("README contract #107",()=>{
  test("required heading order after title",()=>{
    const hs=headings(readme);
    const required=["Installation","Technical Requirements","Our Shelf","Motivation and Purpose","Philosophy","Which skill and when","AI-First Workflow Integration","Comparative Analysis","Critical Evaluation","Future Roadmap"];
    let idx=-1;
    for(const r of required){
      const pos=hs.findIndex((h,i)=>i>idx && h.toLowerCase().includes(r.toLowerCase()));
      assert.ok(pos!==-1,`missing heading containing "${r}" after position ${idx}. headings: ${hs.join(" | ")}`);
      idx=pos;
    }
    // title first
    assert.ok(hs[0].toLowerCase().includes("ruralnative"));
  });
  test("shelf has exactly three skill entries",()=>{
    // find Our Shelf section
    const shelfIdx=readme.toLowerCase().indexOf("our shelf");
    const nextHeading=readme.indexOf("\n## ",shelfIdx+10);
    const shelfSec=readme.slice(shelfIdx, nextHeading===-1? undefined: nextHeading);
    const rows=[...shelfSec.matchAll(/^\|\s*\*\*.*?\*\*/gm)];
    // also count document-for- rows
    assert.equal(rows.length,3,`expected 3 shelf rows, got ${rows.length}`);
    assert.ok(shelfSec.includes("document-for-agents"));
    assert.ok(shelfSec.includes("document-for-humans"));
    assert.ok(shelfSec.includes("unslopify"));
    assert.ok(!shelfSec.includes("plan-this"));
  });
  test("exactly three installation commands in dependency order unslopify first",()=>{
    const instIdx=readme.toLowerCase().indexOf("installation");
    const nextIdx=readme.indexOf("\n## ",instIdx+20);
    const instSec=readme.slice(instIdx, nextIdx===-1? undefined: nextIdx);
    const codeBlock=[...instSec.matchAll(/```bash([\s\S]*?)```/g)].map(m=>m[1]).join("\n");
    const cmds=[...codeBlock.matchAll(/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(cmds,["unslopify","document-for-agents","document-for-humans"]);
  });
  test("focused doc-cache purpose language",()=>{
    const n=readme.toLowerCase();
    assert.ok(n.includes("codebase cache") || n.includes("cache for the unrecoverable"));
    assert.ok(n.includes("where-and-why") || n.includes("where and why"));
    assert.ok(n.includes("focused loading") || n.includes("focused") && n.includes("instead of reading all docs"));
    assert.ok(readme.includes("unrecoverable"));
  });
});
