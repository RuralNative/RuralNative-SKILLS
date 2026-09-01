// Compact worker dispatch packets (#157, parent spec #152; stable criterion
// IDs #188; versioned requirements revision #190).
//
// The packet carries settled scope and revisions. Workers still load the
// mandated orientation and owning-seam docs, but do not rediscover the whole
// repository by default. Acceptance criteria travel as records carrying their
// stable local ID, text, and active or retired status so evidence matches by
// ID, never by full sentence text. The requirements revision value rides the
// packet so the worker compares the current issue bodies against the
// dispatched fingerprint before delivery (ticket #190).

import type { AcceptanceCriterion } from "./workflow-state.ts";

export type DispatchRiskClass = "ordinary" | "high-risk";

export interface DispatchPacket {
  ticket: number;
  riskClass: DispatchRiskClass;
  revisions: {
    base: string;
    head: string;
  };
  affectedSeams: readonly string[];
  acceptanceCriteria: readonly AcceptanceCriterion[];
  settledDecisions: readonly string[];
  /** Versioned requirements fingerprint of the parent and ticket bodies. */
  requirementsRevision: string;
}

export function createDispatchPacket(input: DispatchPacket): DispatchPacket {
  return {
    ticket: input.ticket,
    riskClass: input.riskClass,
    revisions: { ...input.revisions },
    affectedSeams: [...input.affectedSeams],
    acceptanceCriteria: input.acceptanceCriteria.map((criterion) => ({
      id: criterion.id,
      text: criterion.text,
      status: criterion.status,
    })),
    settledDecisions: [...input.settledDecisions],
    requirementsRevision: input.requirementsRevision,
  };
}

export function serializeDispatchPacket(packet: DispatchPacket): string {
  return JSON.stringify(createDispatchPacket(packet));
}

export function renderDispatchPacket(packet: DispatchPacket): string {
  const normalized = createDispatchPacket(packet);
  const acceptance = normalized.acceptanceCriteria
    .map((criterion) =>
      criterion.status === "retired"
        ? `\`${criterion.id}\` (retired): ${criterion.text}`
        : `\`${criterion.id}\`: ${criterion.text}`,
    )
    .join("; ");
  return [
    `ticket: #${normalized.ticket}`,
    `risk: ${normalized.riskClass}`,
    `revisions: ${normalized.revisions.base} -> ${normalized.revisions.head}`,
    `affected seams: ${normalized.affectedSeams.join(", ")}`,
    `acceptance: ${acceptance}`,
    `settled decisions: ${normalized.settledDecisions.join("; ")}`,
    `requirements revision: ${normalized.requirementsRevision}`,
  ].join("\n");
}
