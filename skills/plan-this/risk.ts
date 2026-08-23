// Risk assignment for planned tickets (#157, parent spec #152).
//
// Pure: captured planning facts in, a durable ticket risk record out. The
// workflow records the class before publication and only raises it later.

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

export interface RiskAssessment {
  riskClass: RiskClass;
  evidence: string[];
  sloMinutes: number;
}

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

export function classifyRisk(signals: RiskSignals): RiskAssessment {
  const evidence = [...(signals.evidence ?? [])].filter((item) => item.trim() !== "");
  const triggers = SIGNAL_LABELS
    .filter(([key]) => signals[key] === true)
    .map(([, label]) => label);
  const highRisk = triggers.length > 0 && hasEvidence(signals);
  const recordEvidence = highRisk
    ? [...triggers, ...evidence]
    : evidence;
  const riskClass: RiskClass = highRisk ? "high-risk" : "ordinary";
  return { riskClass, evidence: recordEvidence, sloMinutes: sloMinutesForRisk(riskClass) };
}

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
): { ticket: number; assessment: RiskAssessment } {
  return { ticket, assessment: classifyRisk(signals) };
}
