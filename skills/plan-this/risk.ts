// Risk assignment for planned tickets (#157, parent spec #152, #185).
//
// Pure: captured planning facts in, a durable ticket risk record out. The
// workflow records the class before publication and only raises it later.
// A high-risk trigger without supporting evidence no longer degrades to
// `ordinary`: it returns an internal incomplete result that blocks
// publication and risk labeling (spec #183 AC-10). Published tickets carry
// only `ordinary` or `high-risk`.

export type RiskClass = "ordinary" | "high-risk";

export const ORDINARY_SLO_MINUTES = 60;
export const HIGH_RISK_SLO_MINUTES = 90;

export interface RiskSignals {
  securityBoundary?: boolean;
  migration?: boolean;
  sharedContract?: boolean;
  broadPublicInterface?: boolean;
  dependencyChange?: boolean;
  comparableBlastRadius?: boolean;
  evidence?: readonly string[];
}

/** A publishable risk record: a public class plus the evidence that supports it. */
export interface RiskAssessment {
  riskClass: RiskClass;
  evidence: string[];
  sloMinutes: number;
}

/**
 * Internal pre-publication state: at least one high-risk trigger lacks
 * supporting evidence, so the ticket cannot receive a public risk class.
 */
export interface IncompleteRisk {
  incomplete: true;
  /** The high-risk trigger labels whose supporting evidence is missing. */
  missingEvidence: string[];
}

export type RiskOutcome = RiskAssessment | IncompleteRisk;

const SIGNAL_LABELS: ReadonlyArray<readonly [keyof RiskSignals, string]> = [
  ["securityBoundary", "security boundary"],
  ["migration", "migration"],
  ["sharedContract", "shared contract"],
  ["broadPublicInterface", "broad public interface"],
  ["dependencyChange", "dependency change"],
  ["comparableBlastRadius", "comparable blast radius"],
];

function hasEvidence(signals: RiskSignals): boolean {
  return (signals.evidence ?? []).some((item) => item.trim().length > 0);
}

export function sloMinutesForRisk(riskClass: RiskClass): number {
  return riskClass === "high-risk"
    ? HIGH_RISK_SLO_MINUTES
    : ORDINARY_SLO_MINUTES;
}

/**
 * Classify planning risk. A high-risk trigger without supporting evidence
 * returns an incomplete result that names the missing evidence; that result
 * must not reach a published ticket. `isPublishableRisk` is the gate.
 */
export function classifyRisk(signals: RiskSignals): RiskOutcome {
  const evidence = [...(signals.evidence ?? [])].filter((item) => item.trim() !== "");
  const triggers = SIGNAL_LABELS
    .filter(([key]) => signals[key] === true)
    .map(([, label]) => label);
  if (triggers.length === 0) {
    return {
      riskClass: "ordinary",
      evidence,
      sloMinutes: sloMinutesForRisk("ordinary"),
    };
  }
  if (!hasEvidence(signals)) {
    return { incomplete: true, missingEvidence: triggers };
  }
  return {
    riskClass: "high-risk",
    evidence: [...triggers, ...evidence],
    sloMinutes: sloMinutesForRisk("high-risk"),
  };
}

/**
 * The publication gate: only a complete risk assessment may label a ticket.
 * An incomplete result stops publication and risk labeling.
 */
export function isPublishableRisk(
  outcome: RiskOutcome,
): outcome is RiskAssessment {
  return !("incomplete" in outcome);
}

/**
 * Later stages may raise a classified ticket with evidence and may never lower
 * it. Evidence without a trigger, or a trigger without evidence, leaves the
 * current class unchanged.
 */
export function escalateRisk(
  current: RiskAssessment,
  signals: RiskSignals,
): RiskAssessment {
  const triggers = SIGNAL_LABELS
    .filter(([key]) => signals[key] === true)
    .map(([, label]) => label);
  const evidence = [...(signals.evidence ?? [])].filter((item) => item.trim() !== "");
  const raises = triggers.length > 0 && hasEvidence(signals);
  const nextClass: RiskClass =
    current.riskClass === "high-risk" || raises ? "high-risk" : "ordinary";
  return {
    riskClass: nextClass,
    evidence: [...current.evidence, ...triggers, ...evidence],
    sloMinutes: sloMinutesForRisk(nextClass),
  };
}

export function recordTicketRisk(
  ticket: number,
  signals: RiskSignals,
): { ticket: number; assessment: RiskOutcome } {
  return { ticket, assessment: classifyRisk(signals) };
}
