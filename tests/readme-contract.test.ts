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

describe("README contract (ADR-0031, ADR-0035)",()=>{
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

  test("workflow section lists exactly four workflow commands",()=>{
    const wfSec=wfSection();
    const rows=[...wfSec.matchAll(/^\|\s*\*\*(plan-this|implement-this|review-this|fix-this)\*\*/gm)];
    assert.equal(rows.length,4,`expected 4 workflow command rows, got ${rows.length}`);
    assert.ok(
      wfSec.includes("/grill-with-docs -> /to-spec -> /to-tickets"),
      "workflow section missing the opinionated chain",
    );
    assert.ok(/opinionated/i.test(wfSec),"workflow must be called opinionated");
  });

  test("workflow installs cover Matt Pocock dependencies before local adapters",()=>{
    const instIdx=readme.toLowerCase().indexOf("### workflow skills");
    assert.notEqual(instIdx,-1,"missing workflow skills install subsection");
    const sec=section(instIdx);
    const mp=[...bashCmds(sec,/npx skills add mattpocock\/skills --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(mp,["grill-with-docs","grilling","domain-modeling","to-spec","to-tickets"]);
    const local=[...bashCmds(sec,/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(local,["plan-this","implement-this","review-this","fix-this"]);
  });

  test("each Matt Pocock dependency links its verified source",()=>{
    const deps={
      "grill-with-docs": "skills/engineering/grill-with-docs",
      "grilling": "skills/productivity/grilling",
      "domain-modeling": "skills/engineering/domain-modeling",
      "to-spec": "skills/engineering/to-spec",
      "to-tickets": "skills/engineering/to-tickets",
    };
    for(const [dep, dir] of Object.entries(deps)){
      const link=`https://github.com/mattpocock/skills/tree/main/${dir}`;
      assert.ok(readme.includes(link),`missing verified source link ${link} for ${dep}`);
    }
  });

  test("implement-this has no upstream implement dependency",()=>{
    assert.ok(readme.includes("no `/implement` delegation"),"README must state implement-this has no /implement delegation");
    assert.equal(/npx skills add mattpocock\/skills --skill implement\b/.test(readme),false,"README must not require upstream implement");
  });

  test("native host invocation is documented without slash-argument forwarding",()=>{
    const wfSec=wfSection();
    assert.ok(/\$plan-this/.test(readme),"README must document Codex $plan-this form");
    assert.ok(/no-argument selection|select the skill with no arguments/.test(wfSec),"README must document OpenCode no-argument selection");
    assert.ok(/slash-argument forwarding is unsupported/.test(wfSec),"README must mark slash-argument forwarding unsupported");
    assert.ok(/NOT VERIFIED/.test(wfSec),"README must mark live host checks NOT VERIFIED");
    assert.ok(/candidate.*not certified literal/.test(wfSec),"README must mark separate-message route as candidate");
    assert.ok(/Kilo Code is the verified reference/.test(wfSec),"README must keep Kilo as verified reference");
  });

  test("current checkout with no workers",()=>{
    const wfSec=wfSection();
    assert.ok(/current checkout/i.test(wfSec),"missing current checkout");
    assert.ok(!/agent_manager/i.test(wfSec),"README workflow must not name Agent Manager");
    assert.ok(!/at most three workers/i.test(wfSec),"README must not promise worker caps");
    assert.ok(!/cleanup-pending/i.test(wfSec),"README must not promise managed cleanup states");
    assert.ok(!/recovery-required/i.test(wfSec),"README must not promise recovery states");
  });

  test("review cadence: one frontier pass, delta review, final fix stage",()=>{
    const wfSec=wfSection();
    assert.ok(/one full Standards-plus-Spec/i.test(wfSec),"missing one frontier pass");
    assert.ok(/delta review/i.test(wfSec),"missing delta review");
    assert.ok(/review-handoff-v1/i.test(wfSec),"missing review handoff statement");
    assert.ok(/\/fix-this/i.test(wfSec),"missing final fix stage");
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
