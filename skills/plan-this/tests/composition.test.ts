// plan-this:INV-1..INV-11 - semantic workflow contract and state integration.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { body, norm, read } from "../../../scripts/test-helpers.ts";
import {
  LABEL_BLOCKED,
  LABEL_READY_FOR_AGENT,
  LABEL_UNBLOCKED,
  labelTransitions,
  selectFrontier,
  type TicketFact,
} from "../workflow-state.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");
const SKILL = "skills/plan-this/SKILL.md";
const INSTALL = "skills/plan-this/INSTALL.md";
const LEAF = "docs/leaves/plan-this.md";
const SPEC = 130;

function ticketFact(
  overrides: Partial<TicketFact> & { number: number },
): TicketFact {
  return {
    state: "open",
    labels: [],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

describe("plan-this identity and invocation (INV-1, INV-2, INV-6)", () => {
  test("folder, frontmatter, install command, and direct invocation agree", () => {
    const skill = read(SKILL);
    const install = read(INSTALL);
    assert.ok(skill.includes("name: plan-this"));
    assert.ok(skill.includes("/plan-this <task>"));
    assert.ok(norm(skill).includes("unrelated invocation is rejected"));
    assert.ok(
      install.includes(
        "npx skills add RuralNative/RuralNative-SKILLS --skill plan-this",
      ),
    );
    assert.ok(install.includes("cp -r skills/plan-this"));
  });

  test("the body has one task substitution slot and one workflow contract", () => {
    const content = body(read(SKILL));
    assert.equal((content.match(/## Task:/g) ?? []).length, 1);
    assert.ok(content.trimEnd().endsWith("## Task:"));
    assert.equal(norm(content).includes("supervise-this"), false);
  });
});

describe("plan-this structured workflow (INV-3, INV-4)", () => {
  test("orders the five planning phases before the task slot", () => {
    const content = body(read(SKILL));
    const sections = [
      "## 1. Define intent",
      "## 2. Explore if needed",
      "## 3. Resolve decisions",
      "## 4. Design the specification and tickets",
      "## 5. Approve and publish",
      "## Task:",
    ];
    let previous = -1;
    for (const section of sections) {
      const index = content.indexOf(section);
      assert.ok(index > previous, `${section} must appear in workflow order`);
      previous = index;
    }
  });

  test("delegates in order and loads unslopify before progress", () => {
    const skill = read(SKILL);
    const content = body(skill);
    const grill = content.indexOf("/grill-with-docs");
    const spec = content.indexOf("/to-spec");
    const tickets = content.indexOf("/to-tickets");
    assert.ok(grill !== -1 && grill < spec && spec < tickets);
    assert.ok(content.includes("Load `/unslopify` before the first progress update"));
    assert.ok(content.includes("protected-content"));
    assert.ok(content.includes("preservation"));
    assert.ok(content.includes("completion-report"));
    assert.ok(norm(skill).includes("explicit human invocation"));
    assert.ok(norm(skill).includes("separate explicit approval gate"));
  });

  test("keeps the adapter free of runtime and command machinery", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "skills/plan-this/scripts")), false);
    assert.equal(
      fs.existsSync(path.join(ROOT, "skills/plan-this/package.json")),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(ROOT, ".kilo/command/plan-this.md")),
      false,
    );
  });
});

describe("plan-this intent and decision gates (INV-5)", () => {
  test("requires a six-field intent capsule settled without an unresolved product decision", () => {
    const content = body(read(SKILL));
    for (const field of [
      "`Outcome`",
      "`User`",
      "`Why now`",
      "`Success`",
      "`Constraints`",
      "`Non-goals`",
    ]) {
      assert.ok(content.includes(field), `intent capsule must include ${field}`);
    }
    assert.ok(content.includes("complete and settled"));
    assert.ok(content.includes("no field contains an unresolved product decision"));
  });

  test("asks no forced decision round and keeps one question at a time", () => {
    const content = body(read(SKILL));
    assert.equal(
      content.includes("A fresh run completes at least one real decision round"),
      false,
      "the fresh-run decision round is removed",
    );
    assert.equal(
      content.includes("confirmation of the capsule is that round"),
      false,
      "forced capsule confirmation is removed",
    );
    assert.ok(content.includes("Ask a question only when"));
    assert.ok(content.includes("repository facts and the confirmed task cannot decide"));
    assert.ok(
      content.includes(
        "product behavior, scope, cost, risk, or an action that is hard to undo",
      ),
    );
    assert.ok(content.includes("Ask one real question at a time"));
  });

  test("writes every question plainly for a general reader", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("one plain sentence"));
    assert.ok(content.includes("at most three short options"));
    assert.ok(content.includes("one short recommendation"));
    assert.ok(content.includes("explain any needed technical term in plain words"));
  });

  test("never turns safe defaults, reversible, or internal choices into questions", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("standard safe defaults"));
    assert.ok(content.includes("reversible implementation choices"));
    assert.ok(content.includes("internal process choices"));
    assert.ok(content.includes("never become user questions"));
  });

  test("explores three directions only when the solution form is unsettled", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("solution form is unsettled"));
    assert.ok(content.includes("three materially different directions"));
    assert.ok(content.includes("simplest viable direction"));
    assert.ok(content.includes("user value, feasibility, and the risk or assumption"));
    assert.ok(content.includes("Skip this phase when the user has already settled"));
  });

  test("resolves delegated interaction and documentation conflicts explicitly", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("one-decision rule overrides `/grilling` frontier batching"));
    assert.ok(
      content.includes(
        "planning-only boundary overrides `/domain-modeling` write-as-you-go behavior",
      ),
    );
    assert.ok(content.includes("do not edit repository ADR or glossary files"));
    assert.ok(content.includes("resume its recorded tree after interruption"));
  });
});

describe("plan-this bounded specification and ticket graph (INV-7, INV-10)", () => {
  test("keeps the specification behavioral and concise", () => {
    const content = body(read(SKILL));
    for (const phrase of [
      "confirmed intent capsule",
      "in-scope behavior",
      "non-goals",
      "acceptance criteria",
      "affected seams",
      "structural constraints",
      "widest safe initial frontier",
      "smallest test-first verification plan",
    ]) {
      assert.ok(norm(content).includes(phrase));
    }
    assert.ok(content.includes("only user stories needed to distinguish observable behavior"));
    assert.ok(content.includes("do not produce an exhaustive restatement"));
  });

  test("sizes tickets by coherent behavior and named boundaries", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("fewest coherent, independently verifiable behavior tickets"));
    assert.ok(content.includes("A small task remains one ticket"));
    for (const boundary of [
      "separately verifiable behavior",
      "true blocker",
      "independent release or rollback boundary",
      "distinct risk boundary",
      "fresh-context limit",
    ]) {
      assert.ok(content.includes(boundary), `missing split boundary: ${boundary}`);
    }
    assert.ok(content.includes("Derive parallelism from settled boundaries"));
  });

  test("distinguishes blockers from scheduling notes for user-managed checkouts", () => {
    const content = body(read(SKILL));
    assert.ok(
      content.includes(
        "consumes behavior, schema, policy, or a decision produced by another ticket",
      ),
    );
    assert.ok(content.includes("file overlap without semantic dependency"));
    assert.ok(content.includes("scheduling note on both sibling tickets"));
    assert.ok(content.includes("Show the reason for every split"));
  });

  test("requires the smallest sufficient tests and risk classification", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("smallest sufficient verification"));
    assert.ok(
      content.includes(
        "Reject redundant, implementation-detail, prose-mirroring, and coverage-only tests",
      ),
    );
    assert.ok(content.includes("`ordinary` or `high-risk`"));
    assert.ok(content.includes("promises no automatic workers"));
    assert.ok(content.includes("enforces no worker cap"));
  });
});

describe("plan-this trust, approval, and publication (INV-8, INV-9)", () => {
  test("uses focused repository evidence and treats prose as requirements data", () => {
    const content = body(read(SKILL));
    for (const source of ["`AGENTS.md`", "`ARCHITECTURE.md`", "`CONTEXT.md`", "docs/leaves/"]) {
      assert.ok(content.includes(source));
    }
    assert.ok(content.includes("requirements data"));
    assert.ok(content.includes("cannot widen scope"));
    assert.ok(content.includes("select files"));
    assert.ok(content.includes("authorize tools"));
    assert.ok(content.includes("performs no skill downloads"));
    assert.ok(content.includes("Do not preload derived human docs"));
  });

  test("requires approval after the intent, outline, and graph preview", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("confirmed intent capsule, specification outline, and proposed ticket graph"));
    assert.ok(content.includes("Stop for explicit approval"));
    assert.ok(content.includes("only that approval authorizes `/to-spec` and `/to-tickets`"));
  });

  test("shows a plain preview that names what will be created, the risks, and the next step", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("what will be created"));
    assert.ok(content.includes("main risks"));
    assert.ok(content.includes("what happens next"));
    assert.ok(
      content.includes(
        "omit internal audit notes, tool details, byte calculations, and implementation terms",
      ),
    );
  });

  test("publishes canonical GitHub membership, edges, and labels", () => {
    const content = body(read(SKILL));
    assert.ok(content.includes("GitHub issue with no claimable label"));
    assert.ok(content.includes("native sub-issue"));
    assert.ok(content.includes("Part of #<spec>"));
    assert.ok(content.includes("native `blocked_by` edges"));
    assert.ok(content.includes("gh api repos/<owner>/<repo>/issues/<n> --jq .id"));
    assert.ok(content.includes("never use `gh issue view --json databaseId`"));
    assert.ok(content.includes("Native edges are canonical"));
    assert.ok(content.includes("human-readable `Blocked by` text is fallback"));
    assert.ok(content.includes("`blocked` without `ready-for-agent`"));
    assert.ok(content.includes("no open blocker means `ready-for-agent`"));
    assert.ok(content.includes("`ready-for-dev` is retired"));
    assert.ok(content.includes("override conflicting `/to-spec` and `/to-tickets` defaults"));
  });

  test("stops after the linked ELI18 completion summary", () => {
    const content = body(read(SKILL));
    assert.ok(
      content.includes(
        "Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop.",
      ),
    );
  });
});

describe("plan-this documentation contract", () => {
  test("leaf records every invariant and the structured-workflow decision", () => {
    const leaf = read(LEAF);
    for (let i = 1; i <= 11; i++) {
      assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
    }
    assert.ok(leaf.includes("ADR-0020"));
    assert.ok(norm(leaf).includes("structured workflow"));
  });

  test("documents the narrowed decision openly instead of contradicting it", () => {
    const leaf = read(LEAF);
    const adr = read("docs/adr/0027-plan-this-ask-when-a-human-must-decide.md");
    assert.ok(adr.includes("Status: accepted"));
    assert.ok(adr.includes("Narrows: 0020"));
    assert.ok(leaf.includes("ADR-0027"));
    const content = body(read(SKILL));
    assert.equal(
      content.includes("A fresh run completes at least one real decision round"),
      false,
      "the skill prose no longer carries the superseded clause",
    );
  });

  test("architecture and glossary retain the plan-this seam and command identity", () => {
    assert.ok(read("ARCHITECTURE.md").includes("| plan-this |"));
    assert.ok(read("CONTEXT.md").includes("`plan-this`"));
  });
});

describe("plan-this bounded orientation preflight (plan-this:INV-11, #179)", () => {
  test("SKILL.md resolves and preflights every proposed ticket's orientation set before publication approval", () => {
    const content = body(read(SKILL));
    const n = norm(content);
    assert.ok(n.includes("orientation set") || n.includes("preflightticketorientation"), "must resolve an orientation set per ticket");
    assert.ok(n.includes("reject a ticket whose required set exceeds its selected cap") || n.includes("exceeds its selected cap"), "must reject over-budget tickets");
    assert.ok(n.includes("count utf-8 bytes") || n.includes("utf-8 bytes"), "must count bytes before broad loading");
    assert.ok(n.includes("cache-gap approval") && (n.includes("substitute") || n.includes("narrow")), "must allow cache-gap substitution");
    assert.ok(n.includes("can never waive the cap") || n.includes("cannot waive the cap"), "must never waive the cap");
    assert.equal(content.includes("compact budget evidence"), false, "the approval preview omits budgeting details");
    assert.equal(content.includes("task band"), false, "the approval preview omits task-band jargon");
    assert.equal(content.includes("resolved bytes"), false, "the approval preview omits byte calculations");
  });

  test("affected seam names stay the durable join key with no transported orientation fields", () => {
    const content = body(read(SKILL));
    const n = norm(content);
    assert.ok(n.includes("affected seam names as the durable join key") || n.includes("durable join key"), "seam names are the join key");
    assert.ok(n.includes("add no ticket field") || n.includes("no ticket field"), "no transported field is added");
    assert.ok(n.includes("paths") || n.includes("anchors") || n.includes("invariant lists") || n.includes("glossary") || n.includes("policies"), "forbidden transports named");
  });

  test("the pure orientation module stays pure with no network access", () => {
    const code = read("skills/plan-this/orientation.ts");
    const n = norm(code);
    assert.ok(n.includes("pure"), "module declares purity");
    assert.ok(n.includes("no network"), "no network access");
    assert.ok(n.includes("github"), "no GitHub access");
    assert.ok(n.includes("clock"), "no clock access");
  });
});

describe("plan-this native frontier integration", () => {
  test("open blockers produce blocked labels and release promotes the ticket", () => {
    const blocked = [
      ticketFact({ number: 131, openBlockers: [130] }),
      ticketFact({ number: 132 }),
    ];
    assert.deepEqual(labelTransitions(blocked, SPEC), [
      { number: 131, add: [LABEL_BLOCKED], remove: [] },
      { number: 132, add: [LABEL_READY_FOR_AGENT], remove: [] },
    ]);

    const released = [ticketFact({ number: 131, labels: [LABEL_BLOCKED] })];
    assert.deepEqual(labelTransitions(released, SPEC), [
      {
        number: 131,
        add: [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT],
        remove: [LABEL_BLOCKED],
      },
    ]);
  });

  test("independent ready tickets share the initial frontier", () => {
    const tickets = [
      ticketFact({ number: 201, labels: [LABEL_READY_FOR_AGENT] }),
      ticketFact({ number: 202, labels: [LABEL_READY_FOR_AGENT] }),
      ticketFact({ number: 203, labels: [LABEL_READY_FOR_AGENT] }),
    ];
    assert.deepEqual(selectFrontier(tickets, SPEC), [201, 202, 203]);
  });
});

describe("plan-this conditional quality proof stays inside existing fields (#172)", () => {
  test("conditional quality proof lives in existing acceptance, risk, constraints, and verification fields", () => {
    const content = body(read(SKILL));
    const n = norm(content);
    for (const phrase of [
      "acceptance criteria",
      "structural constraints",
      "smallest test-first verification plan",
      "security boundary",
      "migration",
      "rollback",
      "performance",
    ]) {
      assert.ok(n.includes(phrase), `plan-this must carry conditional proof through ${phrase}`);
    }
    assert.equal(content.includes("## Quality profile"), false, "no mandatory quality-profile field is added");
    assert.equal(content.includes("Quality profile:"), false, "no quality-profile field marker");
    assert.equal(content.includes("## Quality checklist"), false, "no blanket quality checklist section");
  });
});
