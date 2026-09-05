// Fix-agent authority for the single pull-request review (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. The optional configured `review-fixer` subagent edits
// and runs focused tests only; the frontier reviewer owns verdict, commit,
// push, merge, and tracker state.

export const FIX_AGENT_NAME = "review-fixer";

export type FixAgentForbiddenAction =
  | "commit"
  | "push"
  | "publish-verdict"
  | "merge"
  | "labels"
  | "promotion"
  | "closure";

export const FIX_AGENT_FORBIDDEN_ACTIONS: readonly FixAgentForbiddenAction[] = [
  "commit",
  "push",
  "publish-verdict",
  "merge",
  "labels",
  "promotion",
  "closure",
] as const;

export interface ConfirmedFindingRef {
  id: string;
  file: string;
  line: number;
  evidence: string;
}

export interface FixPacket {
  agent: typeof FIX_AGENT_NAME;
  prNumber: number;
  findings: readonly ConfirmedFindingRef[];
  permittedSeams: readonly string[];
  focusedTestCommands: readonly string[];
}

export interface FixPacketDecision {
  ok: boolean;
  reason: string;
}

/**
 * Build the narrow fix packet for the configured fix agent: confirmed
 * finding IDs, exact file and line evidence, permitted affected seams, and
 * focused test commands. Unrelated edits are rejected by the reviewer.
 */
export function buildFixPacket(
  prNumber: number,
  findings: readonly ConfirmedFindingRef[],
  permittedSeams: readonly string[],
  focusedTestCommands: readonly string[],
): { packet: FixPacket | null; decision: FixPacketDecision } {
  if (findings.length === 0) {
    return { packet: null, decision: { ok: false, reason: "no confirmed blocking findings to fix" } };
  }
  for (const finding of findings) {
    if (finding.id.trim() === "" || finding.file.trim() === "" || finding.evidence.trim() === "") {
      return { packet: null, decision: { ok: false, reason: `confirmed finding is missing id, file, or evidence` } };
    }
  }
  if (permittedSeams.length === 0) {
    return { packet: null, decision: { ok: false, reason: "no permitted affected seams for the fix" } };
  }
  if (focusedTestCommands.length === 0) {
    return { packet: null, decision: { ok: false, reason: "no focused test commands for the fix" } };
  }
  return {
    packet: { agent: FIX_AGENT_NAME, prNumber, findings, permittedSeams, focusedTestCommands },
    decision: { ok: true, reason: "fix packet carries confirmed findings, seams, and focused tests only" },
  };
}

/** True when the named subagent is the configured fix agent. */
export function isConfiguredFixAgent(name: string): boolean {
  return name === FIX_AGENT_NAME;
}
