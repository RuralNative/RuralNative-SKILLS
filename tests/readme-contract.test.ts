import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const readme = fs.readFileSync(path.join(ROOT,"README.md"),"utf8");
function headings(m:string){ return [...m.matchAll(/^#{1,3}\s+(.+)$/gm)].map(x=>x[1].trim()); }
function section(startIdx:number){ const next=readme.indexOf("\n## ",startIdx+10); return readme.slice(startIdx, next===-1? undefined: next); }
function bashCmds(sec:string, re:RegExp){ return [...sec.matchAll(/```bash([\s\S]*?)```/g)].map(m=>m[1]).join("\n").matchAll(re); }
function wfSection(){ return section(readme.indexOf("\n## Development Workflow")); }

describe("README contract (ADR-0031)",()=>{
  test("required heading order after title",()=>{
    const hs=headings(readme);
    const required=["Installation","Technical Requirements","Our Shelf","Motivation and Purpose","Philosophy","Which skill and when","Development Workflow","AI-First Workflow Integration","Comparative Analysis","Critical Evaluation","Future Roadmap"];
    let idx=-1;
    for(const r of required){
      const pos=hs.findIndex((h,i)=>i>idx && h.toLowerCase().includes(r.toLowerCase()));
      assert.ok(pos!==-1,`missing heading containing "${r}" after position ${idx}. headings: ${hs.join(" | ")}`);
      idx=pos;
    }
    assert.ok(hs[0].toLowerCase().includes("ruralnative"));
  });

  test("workflow section lists exactly three workflow commands",()=>{
    const wfSec=wfSection();
    const rows=[...wfSec.matchAll(/^\|\s*\*\*(plan-this|implement-this|review-this)\*\*/gm)];
    assert.equal(rows.length,3,`expected 3 workflow command rows, got ${rows.length}`);
    assert.ok(
      wfSec.includes("/grill-with-docs -> /to-spec -> /to-tickets -> /implement"),
      "workflow section missing the opinionated chain",
    );
    assert.ok(/opinionated/i.test(wfSec),"workflow must be called opinionated");
  });

  test("workflow installs cover Matt Pocock dependencies before local adapters",()=>{
    const instIdx=readme.toLowerCase().indexOf("### workflow skills");
    assert.notEqual(instIdx,-1,"missing workflow skills install subsection");
    const sec=section(instIdx);
    const mp=[...bashCmds(sec,/npx skills add mattpocock\/skills --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(mp,["grill-with-docs","to-spec","to-tickets","implement"]);
    const local=[...bashCmds(sec,/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(local,["plan-this","implement-this","review-this"]);
  });

  test("each Matt Pocock dependency links its verified source under skills/engineering",()=>{
    const deps=["grill-with-docs","to-spec","to-tickets","implement"];
    for(const dep of deps){
      const link=`https://github.com/mattpocock/skills/tree/main/skills/engineering/${dep}`;
      assert.ok(readme.includes(link),`missing verified source link ${link}`);
    }
  });

  test("current checkout with no workers",()=>{
    const wfSec=wfSection();
    assert.ok(/current checkout/i.test(wfSec),"missing current checkout");
    assert.ok(!/agent_manager/i.test(wfSec),"README workflow must not name Agent Manager");
    assert.ok(!/at most three workers/i.test(wfSec),"README must not promise worker caps");
    assert.ok(!/cleanup-pending/i.test(wfSec),"README must not promise managed cleanup states");
    assert.ok(!/recovery-required/i.test(wfSec),"README must not promise recovery states");
  });

  test("review cadence: one frontier pass, delta review, one fix round",()=>{
    const wfSec=wfSection();
    assert.ok(/one full Standards-plus-Spec/i.test(wfSec),"missing one frontier pass");
    assert.ok(/delta review/i.test(wfSec),"missing delta review");
    assert.ok(/at most one automatic fix round/i.test(wfSec),"missing one-fix cap");
  });

  test("focused verification with CI reuse and no post-merge run",()=>{
    const wfSec=wfSection();
    assert.ok(/smallest sufficient/i.test(wfSec),"missing focused checks");
    assert.ok(/never runs the full repository gate/i.test(wfSec),"missing no-full-gate statement");
    assert.ok(/broad verification gate/i.test(wfSec),"missing CI broad gate");
    assert.ok(/No post-merge verification/i.test(wfSec),"missing no post-merge statement");
  });

  test("no coordinator promises or automatic deletion",()=>{
    assert.ok(!readme.includes("coordinator"),"README must not introduce a coordinator");
    assert.ok(!readme.includes("supervisor"),"README must not introduce a supervisor");
    assert.ok(!readme.includes("orchestrator"),"README must not introduce an orchestrator");
  });
});
