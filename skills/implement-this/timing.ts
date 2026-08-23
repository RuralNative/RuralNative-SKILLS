// Lifecycle timing and trusted PR-summary serialization (#157, #152).
//
// Pure timing facts in, deterministic summary text out. Callers provide
// captured timestamps; this module never reads a clock or posts comments.

export const TIMING_PHASES = [
  "checkout",
  "setup-script",
  "dependency-setup",
  "orientation",
  "implementation",
  "queueing",
  "external-wait",
  "idle",
  "initial-review",
  "fixes",
  "delta-review",
  "final-verification",
] as const;

export type TimingPhase = (typeof TIMING_PHASES)[number];
export type TimingDurations = Partial<Record<TimingPhase, number>>;
export type TimingRiskClass = "ordinary" | "high-risk";

export interface TimingInput {
  riskClass: TimingRiskClass;
  reservedAtMs: number;
  terminalAtMs: number;
  phases: TimingDurations;
  sloMissCause?: string;
}

export interface TimingSummary {
  schema: "ruralnative.workflow-timing.v1";
  riskClass: TimingRiskClass;
  sloMinutes: 60 | 90;
  reservationToTerminalMs: number;
  phases: Record<TimingPhase, number>;
  sloMissed: boolean;
  sloMissCause?: string;
}

export const TIMING_MARKER_START = "<!-- ruralnative:workflow-timing:start -->";
export const TIMING_MARKER_END = "<!-- ruralnative:workflow-timing:end -->";

function sloMs(riskClass: TimingRiskClass): number {
  return (riskClass === "high-risk" ? 90 : 60) * 60 * 1000;
}

function normalizedPhases(input: TimingDurations): Record<TimingPhase, number> {
  return Object.fromEntries(
    TIMING_PHASES.map((phase) => [phase, Math.max(0, input[phase] ?? 0)]),
  ) as Record<TimingPhase, number>;
}

export function buildTimingSummary(input: TimingInput): TimingSummary {
  const elapsed = Math.max(0, input.terminalAtMs - input.reservedAtMs);
  const sloMissed = elapsed > sloMs(input.riskClass);
  return {
    schema: "ruralnative.workflow-timing.v1",
    riskClass: input.riskClass,
    sloMinutes: input.riskClass === "high-risk" ? 90 : 60,
    reservationToTerminalMs: elapsed,
    phases: normalizedPhases(input.phases),
    sloMissed,
    ...(sloMissed
      ? { sloMissCause: input.sloMissCause?.trim() || "cause not recorded" }
      : {}),
  };
}

export function upsertTrustedTimingSummary(
  existingBody: string,
  summary: TimingSummary,
): string {
  const block = [
    TIMING_MARKER_START,
    JSON.stringify(summary),
    TIMING_MARKER_END,
  ].join("\n");
  const markerPattern = new RegExp(
    `${escapeRegExp(TIMING_MARKER_START)}[\\s\\S]*?${escapeRegExp(TIMING_MARKER_END)}`,
    "g",
  );
  const withoutOldBlocks = existingBody.replace(markerPattern, "").trimEnd();
  return withoutOldBlocks.length > 0
    ? `${withoutOldBlocks}\n\n${block}\n`
    : `${block}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseTrustedTimingSummary(body: string): TimingSummary | null {
  const match = body.match(
    new RegExp(
      `${escapeRegExp(TIMING_MARKER_START)}\\n([\\s\\S]*?)\\n${escapeRegExp(TIMING_MARKER_END)}`,
    ),
  );
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (!parsed || typeof parsed !== "object") return null;
    const summary = parsed as Partial<TimingSummary>;
    return summary.schema === "ruralnative.workflow-timing.v1"
      ? (parsed as TimingSummary)
      : null;
  } catch {
    return null;
  }
}
