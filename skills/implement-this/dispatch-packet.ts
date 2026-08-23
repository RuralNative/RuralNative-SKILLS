// Compact worker dispatch packets (#157, parent spec #152).
//
// The packet carries settled scope and revisions. Workers still load the
// mandated orientation and owning-seam docs, but do not rediscover the whole
// repository by default.

export type DispatchRiskClass = "ordinary" | "high-risk";

export interface DispatchPacket {
  ticket: number;
  riskClass: DispatchRiskClass;
  revisions: {
    base: string;
    head: string;
  };
  affectedSeams: readonly string[];
  acceptanceCriteria: readonly string[];
  settledDecisions: readonly string[];
}

export function createDispatchPacket(input: DispatchPacket): DispatchPacket {
  return {
    ticket: input.ticket,
    riskClass: input.riskClass,
    revisions: { ...input.revisions },
    affectedSeams: [...input.affectedSeams],
    acceptanceCriteria: [...input.acceptanceCriteria],
    settledDecisions: [...input.settledDecisions],
  };
}

export function serializeDispatchPacket(packet: DispatchPacket): string {
  return JSON.stringify(createDispatchPacket(packet));
}

export function renderDispatchPacket(packet: DispatchPacket): string {
  const normalized = createDispatchPacket(packet);
  return [
    `ticket: #${normalized.ticket}`,
    `risk: ${normalized.riskClass}`,
    `revisions: ${normalized.revisions.base} -> ${normalized.revisions.head}`,
    `affected seams: ${normalized.affectedSeams.join(", ")}`,
    `acceptance: ${normalized.acceptanceCriteria.join("; ")}`,
    `settled decisions: ${normalized.settledDecisions.join("; ")}`,
  ].join("\n");
}
