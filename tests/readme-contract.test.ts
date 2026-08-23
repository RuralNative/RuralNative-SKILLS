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

describe("README contract #107 #159",()=>{
  test("required heading order after title",()=>{
    const hs=headings(readme);
    const required=["Installation","Technical Requirements","Our Shelf","Motivation and Purpose","Philosophy","Which skill and when","Development Workflow","AI-First Workflow Integration","Comparative Analysis","Critical Evaluation","Future Roadmap"];
    let idx=-1;
    for(const r of required){
      const pos=hs.findIndex((h,i)=>i>idx && h.toLowerCase().includes(r.toLowerCase()));
      assert.ok(pos!==-1,`missing heading containing "${r}" after position ${idx}. headings: ${hs.join(" | ")}`);
      idx=pos;
    }
    // title first
    assert.ok(hs[0].toLowerCase().includes("ruralnative"));
  });

  test("documentation and prose shelf has exactly three skill entries",()=>{
    const shelfIdx=readme.toLowerCase().indexOf("our shelf");
    const shelfSec=section(shelfIdx);
    const rows=[...shelfSec.matchAll(/^\|\s*\*\*.*?\*\*/gm)];
    assert.equal(rows.length,3,`expected 3 shelf rows, got ${rows.length}`);
    assert.ok(shelfSec.includes("document-for-agents"));
    assert.ok(shelfSec.includes("document-for-humans"));
    assert.ok(shelfSec.includes("unslopify"));
  });

  test("workflow section lists exactly three workflow commands",()=>{
    const wfSec=wfSection();
    const rows=[...wfSec.matchAll(/^\|\s*\*\*(plan-this|implement-this|review-this)\*\*/gm)];
    assert.equal(rows.length,3,`expected 3 workflow command rows, got ${rows.length}`);
    for(const name of ["plan-this","implement-this","review-this"]){
      assert.ok(wfSec.includes(`**${name}**`),`workflow section missing ${name}`);
    }
    assert.ok(
      wfSec.includes("/grill-with-docs -> /to-spec -> /to-tickets -> /implement -> /code-review"),
      "workflow section missing the opinionated chain",
    );
    assert.ok(/opinionated/i.test(wfSec),"workflow must be called opinionated");
  });

  test("documentation skills install in dependency order unslopify first",()=>{
    const instIdx=readme.toLowerCase().indexOf("### documentation and prose skills");
    assert.notEqual(instIdx,-1,"missing documentation and prose skills install subsection");
    const wfIdx=readme.toLowerCase().indexOf("### workflow skills");
    const sec=readme.slice(instIdx,wfIdx);
    const cmds=[...bashCmds(sec,/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(cmds,["unslopify","document-for-agents","document-for-humans"]);
  });

  test("workflow installs cover Matt Pocock dependencies before local adapters",()=>{
    const instIdx=readme.toLowerCase().indexOf("### workflow skills");
    assert.notEqual(instIdx,-1,"missing workflow skills install subsection");
    const sec=section(instIdx);
    const mp=[...bashCmds(sec,/npx skills add mattpocock\/skills --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(mp,["grill-with-docs","to-spec","to-tickets","implement","code-review"]);
    const local=[...bashCmds(sec,/npx skills add RuralNative\/RuralNative-SKILLS --skill ([a-z-]+)/g)].map(m=>m[1]);
    assert.deepEqual(local,["plan-this","implement-this","review-this"]);
    // dependency-first: Matt Pocock commands appear before local ones
    const firstMp=readme.indexOf("npx skills add mattpocock/skills",instIdx);
    const firstLocal=readme.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill plan-this",instIdx);
    assert.ok(firstMp!==-1 && firstMp<firstLocal,"Matt Pocock dependencies must be installed before local adapters");
  });

  test("each Matt Pocock dependency links its verified source under skills/engineering",()=>{
    const deps=["grill-with-docs","to-spec","to-tickets","implement","code-review"];
    for(const dep of deps){
      const link=`https://github.com/mattpocock/skills/tree/main/skills/engineering/${dep}`;
      assert.ok(readme.includes(link),`missing verified source link ${link}`);
    }
  });

  test("local workflow skills link their repository folders",()=>{
    for(const dep of ["plan-this","implement-this","review-this"]){
      const link=`https://github.com/RuralNative/RuralNative-SKILLS/tree/main/skills/${dep}`;
      assert.ok(readme.includes(link),`missing repository folder link ${link}`);
    }
  });

  test("links official Kilo VS Code extension and Agent Manager docs as best-tested host",()=>{
    assert.ok(readme.includes("https://marketplace.visualstudio.com/items?itemName=kilocode.kilo-code"),"missing official Kilo Code VS Code extension link");
    assert.ok(readme.includes("https://kilo.ai/docs/automate/agent-manager-workflows"),"missing Agent Manager Workflows guide link");
    assert.match(readme,/https:\/\/kilo\.ai\/docs\/automate\/agent-manager\b/,"missing Agent Manager reference link");
    assert.ok(readme.includes("best-tested host"),"missing best-tested host language");
    assert.ok(!/the only (compatible )?host\b(?! —)/i.test(readme.replace("not the only compatible host","")),"must not claim Kilo is the only host");
  });

  test("mandatory grill and explicit publication approval language",()=>{
    assert.ok(readme.includes("at least one decision frontier"),"missing mandatory grill frontier language");
    assert.ok(/waits? for explicit approval/i.test(readme),"missing explicit approval gate language");
  });

  test("workflow explanation covers isolation, sessions, monitoring, and limits",()=>{
    const wfSec=wfSection();
    assert.ok(/isolation is mandatory/i.test(wfSec),"missing mandatory worktree isolation");
    assert.ok(/one worker owns exactly one (ticket|pull request)/i.test(wfSec),"missing one worker per ticket or PR");
    assert.ok(/30 minutes without progress/i.test(wfSec),"missing 30-minute inactivity checkpoint");
    assert.ok(/at most three workers/i.test(wfSec),"missing three-workers-per-stage limit");
    assert.ok(/at most four managed workers/i.test(wfSec),"missing four-active-managed-workers limit");
    assert.ok(/user-created/i.test(wfSec),"missing user-created command session statement");
  });

  test("local review scope and cleanup semantics are stated accurately",()=>{
    const wfSec=wfSection();
    for(const area of ["security","performance","correctness","style","test bloat","documentation","specification compliance"]){
      assert.ok(wfSec.includes(area),`review scope missing ${area}`);
    }
    assert.ok(wfSec.includes("cleanup-pending"),"missing cleanup-pending description");
    assert.ok(/failed worktrees stay on disk/i.test(wfSec),"missing failed worktree retention");
    assert.ok(/separate audited task/i.test(wfSec),"missing audited pre-existing worktree cleanup note");
  });

  test("no coordinator promises, endless polling, fork execution, or automatic deletion",()=>{
    assert.ok(!readme.includes("coordinator"),"README must not introduce a coordinator");
    assert.ok(!readme.includes("supervisor"),"README must not introduce a supervisor");
    assert.ok(!readme.includes("orchestrator"),"README must not introduce an orchestrator");
    assert.ok(!/automatic(ally)?\s+(delet|remov)/i.test(readme),"README must not promise automatic worktree deletion");
    assert.ok(!/polls? every|endless polling/i.test(readme),"README must not promise fixed-interval endless polling");
    assert.ok(!/\bfork\b/i.test(readme),"README must not involve repository forks in execution");
  });

  test("does not promise an unsafe host fallback that weakens worktree isolation",()=>{
    assert.ok(
      !/without isolated worktrees|worktree isolation (?:is )?optional|(?:fallback|fall back)[^.\n]{0,120}(?:isolat|worktre)|(?:isolat|worktre)[^.\n]{0,120}fallback/i.test(readme),
      "README must not offer fallback-style hosting that bypasses mandatory worktree isolation",
    );
  });

  test("focused doc-cache purpose language",()=>{
    const n=readme.toLowerCase();
    assert.ok(n.includes("codebase cache") || n.includes("cache for the unrecoverable"));
    assert.ok(n.includes("where-and-why") || n.includes("where and why"));
    assert.ok(n.includes("focused loading") || n.includes("focused") && n.includes("instead of reading all docs"));
    assert.ok(readme.includes("unrecoverable"));
  });

  test("ordinary and high-risk classes with 60 and 90 minute SLOs as measured targets",()=>{
    const wfSec=wfSection();
    assert.ok(/ordinary/i.test(wfSec) && /high-risk/i.test(wfSec),"missing ordinary/high-risk classification");
    assert.ok(wfSec.includes("60 minutes"),"missing 60 minutes SLO");
    assert.ok(wfSec.includes("90 minutes"),"missing 90 minutes SLO");
    assert.ok(/measured targets/i.test(wfSec),"missing measured targets language");
    assert.ok(/not reasons to skip/i.test(wfSec) || /preserves every gate/i.test(wfSec),"missing SLO does not bypass gates");
  });

  test("command session, worker session, scheduling collision, and GitHub-durable lifecycle terms",()=>{
    const wfSec=wfSection();
    assert.ok(/command session/i.test(wfSec),"missing command session term");
    assert.ok(/worker session/i.test(wfSec),"missing worker session term");
    assert.ok(/scheduling collision/i.test(wfSec),"missing scheduling collision term");
    assert.ok(/GitHub-durable/i.test(wfSec),"missing GitHub-durable lifecycle term");
  });

  test("implementation uses one isolated worktree per ticket and never edits ticket code in command session",()=>{
    const wfSec=wfSection();
    assert.ok(/Implementation.*one isolated worktree per ticket/i.test(wfSec),"missing implementation one worktree per ticket");
    assert.ok(/never edits ticket code in the command session/i.test(wfSec),"missing never edits ticket code in command session");
  });

  test("review uses one persistent PR worktree with fresh subagents",()=>{
    const wfSec=wfSection();
    assert.ok(/one persistent PR worktree/i.test(wfSec),"missing one persistent PR worktree");
    assert.ok(/from initial review through fixes.*final verification.*merge/i.test(wfSec),"missing PR worktree lifecycle");
    assert.ok(/fresh.*Standards.*Spec.*subagents/i.test(wfSec),"missing fresh Standards and Spec subagents");
    assert.ok(/fresh fix subagent/i.test(wfSec),"missing fresh fix subagent");
  });

  test("review cadence: initial full review, delta rereviews, escalation triggers, advisory batching, two-fix cap",()=>{
    const wfSec=wfSection();
    assert.ok(/initial PR revision.*full Standards and Spec review/i.test(wfSec),"missing initial full review");
    assert.ok(/delta review/i.test(wfSec),"missing delta review");
    assert.ok(/Escalation to full review/i.test(wfSec),"missing escalation to full review");
    for(const trigger of ["new affected seam","trust boundary","schema","dependency state","generated contract","public interface","materially widened diff"]){
      assert.ok(wfSec.toLowerCase().includes(trigger),"missing escalation trigger: "+trigger);
    }
    assert.ok(/Advisory findings never create a round alone/i.test(wfSec),"missing advisory batching");
    assert.ok(/at most two pushed fix heads/i.test(wfSec),"missing two-fix cap");
  });

  test("affected-seam tests during iteration and one final full gate with uncertainty escalation",()=>{
    const wfSec=wfSection();
    assert.ok(/affected-seam tests/i.test(wfSec),"missing affected-seam tests");
    assert.ok(/One planned full repository verification/i.test(wfSec),"missing one planned final full verification");
    assert.ok(/uncertainty escalates to the full repository gate/i.test(wfSec),"missing uncertainty escalation");
  });

  test("immediate review at PR open, dispatch packet, setup measurement, dependency reconciliation, PR timing evidence",()=>{
    const wfSec=wfSection();
    assert.ok(/Review starts immediately when the PR head/i.test(wfSec),"missing immediate review at PR open");
    assert.ok(/dispatch packet/i.test(wfSec),"missing dispatch packet");
    assert.ok(/reruns measured setup only when dependency manifests differ/i.test(wfSec),"missing setup measurement and reconciliation");
    assert.ok(/Every PR summary reports reservation-to-terminal timing/i.test(wfSec),"missing PR timing evidence");
  });

  test("three-ticket smoke acceptance: median at most 60, no ordinary above 90, all gates green",()=>{
    const wfSec=wfSection();
    assert.ok(/three-ticket Kilo smoke run/i.test(wfSec),"missing three-ticket smoke run");
    assert.ok(/median at most 60 minutes/i.test(wfSec),"missing median at most 60 minutes");
    assert.ok(/no ordinary ticket above 90 minutes/i.test(wfSec),"missing no ordinary ticket above 90 minutes");
    assert.ok(/all correctness gates green/i.test(wfSec),"missing all gates green");
  });

  test("does not mention closed PR #164 or superseded separate review/fix worktree model",()=>{
    assert.ok(!readme.includes("#164"),"README must not mention closed PR #164");
    assert.ok(!/separate review.*fix worktree/i.test(readme),"README must not claim superseded separate review/fix worktree model");
  });
});
