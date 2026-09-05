// Focused verification for /implement-this (ADR-0031).
//
// Pure: facts in, decisions out. The ticket's smallest sufficient verification
// selects the focused checks; there is no escalation to the full repository
// gate here. Broad verification belongs to equivalent required CI at review.

export interface FocusedCheckSelection {
  /** Focused commands named by the ticket's smallest sufficient verification. */
  focusedCommands: readonly string[];
  /** True when every active behavioral criterion has a focused command. */
  mappingComplete: boolean;
  /** Count of active behavioral criteria; zero means rationales carry the proof. */
  behavioralCriteria: number;
}

export interface FocusedVerificationPlan {
  runFocusedChecks: boolean;
  runFullRepositoryGate: false;
  reason: string;
}

export function selectFocusedChecks(
  selection: FocusedCheckSelection,
): FocusedVerificationPlan {
  if (!selection.mappingComplete) {
    return {
      runFocusedChecks: false,
      runFullRepositoryGate: false,
      reason: "focused mapping is incomplete; stop with needs-info instead of widening verification",
    };
  }
  if (selection.focusedCommands.length === 0) {
    if (selection.behavioralCriteria === 0) {
      return {
        runFocusedChecks: false,
        runFullRepositoryGate: false,
        reason: "no behavioral criteria; non-behavior criteria carry narrow rationales, so no focused command runs",
      };
    }
    return {
      runFocusedChecks: false,
      runFullRepositoryGate: false,
      reason: "focused mapping is incomplete; stop with needs-info instead of widening verification",
    };
  }
  return {
    runFocusedChecks: true,
    runFullRepositoryGate: false,
    reason: "run exactly the ticket's smallest sufficient focused checks",
  };
}
