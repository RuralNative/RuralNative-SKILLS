// Human-choice gating and question shape for planning (#189, parent spec
// #183).
//
// Pure: captured planning facts in, ask-or-proceed decisions and question
// shape checks out. Planning asks a real question only when repository facts
// and the confirmed task cannot decide a choice that changes product
// behavior, scope, cost, risk, or an action that is hard to undo. Standard
// safe defaults, reversible implementation choices, and internal process
// choices never become user questions, and no run forces a decision round or
// a capsule confirmation when the capsule is complete and settled. No
// network, GitHub, git, filesystem-mutation, clock, or Agent Manager calls.

export type ChoiceImpact =
  | "product-behavior"
  | "scope"
  | "cost"
  | "risk"
  | "hard-to-undo-action";

export interface ChoiceFact {
  /** Short local name of the choice, e.g. `device-focus`. */
  choice: string;
  /** Repository facts and the confirmed task already decide this choice. */
  decided: boolean;
  /** The user-visible effects this choice actually changes; empty means none. */
  impacts: readonly ChoiceImpact[];
  /** The choice has a standard safe default the workflow may apply. */
  safeDefault?: boolean;
  /** The choice is a reversible implementation detail. */
  reversible?: boolean;
  /** The choice is an internal process detail. */
  internalProcess?: boolean;
}

export type AskDecision =
  | { action: "ask"; choice: string; reason: string }
  | { action: "proceed"; choice: string; reason: string };

/**
 * Ask only when repository facts and the confirmed task cannot decide a
 * choice, and the choice changes product behavior, scope, cost, risk, or an
 * action that is hard to undo. Everything else proceeds without a question.
 */
export function decideAsk(fact: ChoiceFact): AskDecision {
  if (fact.decided) {
    return {
      action: "proceed",
      choice: fact.choice,
      reason: "repository facts and the confirmed task already decide this choice",
    };
  }
  if (fact.safeDefault) {
    return {
      action: "proceed",
      choice: fact.choice,
      reason: "a standard safe default handles this choice without a question",
    };
  }
  if (fact.impacts.length === 0) {
    return {
      action: "proceed",
      choice: fact.choice,
      reason:
        "the choice changes no product behavior, scope, cost, risk, or hard-to-undo action",
    };
  }
  if (fact.reversible || fact.internalProcess) {
    return {
      action: "proceed",
      choice: fact.choice,
      reason:
        "a reversible implementation choice or an internal process choice never becomes a user question",
    };
  }
  return {
    action: "ask",
    choice: fact.choice,
    reason:
      "a real unresolved product choice changes what the user gets, what the scope or cost is, the risk, or an action that is hard to undo",
  };
}

export interface TechnicalTerm {
  term: string;
  /** The plain-language explanation shown wherever the term appears. */
  plain: string;
}

export interface QuestionShape {
  /** Clear statement of the one choice this question resolves. */
  sentence: string;
  /** The options the actual decision requires. */
  options: readonly string[];
  /** Clear recommendation based on effects the user can understand. */
  recommendation: string;
  /** Needed technical terms, each with a plain explanation. */
  terms?: readonly TechnicalTerm[];
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

export function validateQuestionShape(shape: QuestionShape): string[] {
  const errors: string[] = [];
  if (shape.sentence.trim().length === 0) {
    errors.push("a question states the one choice it resolves");
  }
  if (shape.options.length < 1) {
    errors.push("a question offers the options the decision requires");
  }
  for (const option of shape.options) {
    if (option.trim().length === 0) {
      errors.push("an option must state a real alternative");
    }
  }
  if (shape.recommendation.trim().length === 0) {
    errors.push("a question gives one clear recommendation");
  }
  for (const term of shape.terms ?? []) {
    if (
      wordCount(term.plain) === 0 ||
      term.plain.trim() === term.term.trim()
    ) {
      errors.push(`technical term "${term.term}" needs a plain explanation`);
    }
  }
  return errors;
}

export interface CapsuleField {
  name: string;
  /** Repository facts and the confirmed task decide this field. */
  decided: boolean;
}

/** The fields of the intent capsule that still contain an unresolved product decision. */
export function unresolvedCapsuleChoices(
  fields: readonly CapsuleField[],
): string[] {
  return fields
    .filter((field) => !field.decided)
    .map((field) => field.name);
}

export type PublicationState = "waiting" | "approved";

export interface ApprovalFact {
  /** The one action that authorizes specification and ticket publication. */
  explicitUserApproval: boolean;
}

/**
 * Explicit approval is the only action that publishes. Answered questions and
 * skipped questions never move this state.
 */
export function publicationApproval(fact: ApprovalFact): PublicationState {
  return fact.explicitUserApproval ? "approved" : "waiting";
}
