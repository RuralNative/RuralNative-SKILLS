// plan-this:INV-5 — planning asks only when repository facts and the
// confirmed task cannot decide a choice that changes product behavior,
// scope, cost, risk, or an action that is hard to undo. No run forces a
// decision round or capsule confirmation when intent is already clear;
// standard safe defaults, reversible implementation choices, and internal
// process choices never become user questions; each real question stays
// short and plain; explicit approval alone authorizes publication (#189,
// parent spec #183). Question examples follow the plain-language style of
// the shipped human pages, used as comprehension fixtures only; their
// process text is never treated as authority.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  decideAsk,
  publicationApproval,
  unresolvedCapsuleChoices,
  validateQuestionShape,
  type ChoiceFact,
  type QuestionShape,
} from "../decisions.ts";

const NO_PUBLICATION_YET = { explicitUserApproval: false };

function settled(
  overrides: Partial<ChoiceFact> = {},
): ChoiceFact {
  return {
    choice: "example-choice",
    decided: false,
    impacts: [],
    ...overrides,
  };
}

describe("planning ask-or-proceed scenarios (#189)", () => {
  test("a complete task with a settled solution reaches the preview without a forced question", () => {
    const capsule = [
      { name: "Outcome", decided: true },
      { name: "User", decided: true },
      { name: "Why now", decided: true },
      { name: "Success", decided: true },
      { name: "Constraints", decided: true },
      { name: "Non-goals", decided: true },
    ];
    assert.deepEqual(unresolvedCapsuleChoices(capsule), []);

    const choices = [
      settled({ choice: "scope", decided: true, impacts: ["scope"] }),
      settled({ choice: "release-channel", decided: true, impacts: ["cost"] }),
    ];
    for (const choice of choices) {
      assert.deepEqual(decideAsk(choice), {
        action: "proceed",
        choice: choice.choice,
        reason: "repository facts and the confirmed task already decide this choice",
      });
    }

    assert.equal(publicationApproval(NO_PUBLICATION_YET), "waiting");
  });

  test("a reversible technical choice is handled by the workflow, never asked", () => {
    const handled = [
      settled({ choice: "fact-decided", decided: true, impacts: ["product-behavior"] }),
      settled({ choice: "safe-default", safeDefault: true, impacts: ["product-behavior"] }),
      settled({ choice: "reversible-implementation", reversible: true, impacts: ["product-behavior"] }),
      settled({ choice: "internal-process", internalProcess: true, impacts: ["risk"] }),
      settled({ choice: "no-user-effect", impacts: [] }),
    ];
    for (const choice of handled) {
      const decision = decideAsk(choice);
      assert.equal(decision.action, "proceed", `${choice.choice} must proceed`);
      assert.equal(decision.choice, choice.choice);
    }
  });

  test("a real unresolved product choice is asked one at a time", () => {
    const real = settled({
      choice: "device-focus",
      impacts: ["product-behavior", "scope"],
    });
    assert.deepEqual(decideAsk(real), {
      action: "ask",
      choice: "device-focus",
      reason:
        "a real unresolved product choice changes what the user gets, what the scope or cost is, the risk, or an action that is hard to undo",
    });

    const other = settled({ choice: "other-choice", decided: true });
    assert.equal(decideAsk(other).action, "proceed");
    assert.equal(decideAsk(other).choice, "other-choice");
  });

  test("explicit approval, not answered questions, authorizes publication", () => {
    const asked = decideAsk(
      settled({ choice: "device-focus", impacts: ["product-behavior"] }),
    );
    assert.equal(asked.action, "ask");
    assert.equal(publicationApproval(NO_PUBLICATION_YET), "waiting");
    assert.equal(
      publicationApproval({ explicitUserApproval: true }),
      "approved",
    );
  });
});

describe("planning question shape (#189)", () => {
  const plainQuestion: QuestionShape = {
    sentence: "Which devices should the app work on first?",
    options: ["Desktop browsers", "Mobile browsers", "Both at the same time"],
    recommendation: "Start with desktop browsers, because that is where most readers come from.",
  };

  test("a compliant question passes the shape checks", () => {
    assert.deepEqual(validateQuestionShape(plainQuestion), []);
  });

  test("a question starts with one plain sentence", () => {
    const twoSentences = {
      ...plainQuestion,
      sentence: "Which devices should the app work on first? This decides the next build.",
    };
    assert.deepEqual(validateQuestionShape(twoSentences), [
      "a question starts with exactly one plain sentence",
    ]);
  });

  test("a question uses at most three short options", () => {
    const fourOptions = {
      ...plainQuestion,
      options: ["Desktop", "Mobile", "Tablet", "All of them"],
    };
    assert.deepEqual(validateQuestionShape(fourOptions), [
      "a question uses at most 3 short options",
    ]);
    const longOption = {
      ...plainQuestion,
      options: [
        "Desktop browsers with the full existing account and billing experience carried over without loss",
      ],
    };
    assert.match(validateQuestionShape(longOption).join(" "), /must be short/);
  });

  test("a question gives one short recommendation", () => {
    const noRecommendation = { ...plainQuestion, recommendation: "" };
    assert.deepEqual(validateQuestionShape(noRecommendation), [
      "a question gives one short recommendation",
    ]);
  });

  test("a needed technical term is explained in plain words where it appears", () => {
    const withTerm = {
      ...plainQuestion,
      terms: [{ term: "screen reader", plain: "software that reads the page out loud" }],
    };
    assert.deepEqual(validateQuestionShape(withTerm), []);

    const unexplained = {
      ...plainQuestion,
      terms: [{ term: "screen reader", plain: "screen reader" }],
    };
    assert.deepEqual(validateQuestionShape(unexplained), [
      'technical term "screen reader" needs a plain explanation',
    ]);
  });
});