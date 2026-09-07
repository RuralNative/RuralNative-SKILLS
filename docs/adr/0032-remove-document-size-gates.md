# 0032 — Remove document-size gates

Status: accepted
Narrows: 0017, 0024, 0030
Date: 2026-09-06

Decision: fixed content-size quotas and size-based documentation-reading gates
are removed. Length alone never fails a document, rejects a ticket, blocks
relevant reading, requires approval, forces a split, or justifies deleting
necessary content. Documents stay sized by responsibility and reader question:
keep requirements, exceptions, decision rationale, boundaries, and operational
consequences the reader needs, and remove repetition and irrelevant material
rather than optimizing counts. Tickets split by independently verifiable
behavior, dependency, risk, or release boundary. Affected seam names continue
to resolve authoritative orientation sources; sources are validated and
deduplicated, then read incrementally as needed. Missing authoritative facts
remain explicit gaps; agents do not invent answers. Real model or tool context
limits require staged reading or a continuity handoff with the gap disclosed;
essential material is never silently truncated and a partial read is never
claimed as complete. Byte or source counts may remain informational and never
decide validity.

Why: ADR-0030 records that essential information was already being trimmed to
fit caps, and its 50% increase preserved the same failure mechanism. The
planning preflight rejected tickets when their required documentation exceeded
a byte cap without inspecting whether that material was redundant or
essential. Writing quotas in skill templates constrained explanations with the
same practical effect as a failing check. Size measures reasoning burden
poorly: line counts depend on wrapping and bytes depend on language and
formatting, while neither measures relevance or completeness.

Consequences:
- Narrows ADR-0017, ADR-0024, and ADR-0030: the attention contract keeps
  relevant-source selection, deduplication, source authority, and incremental
  inspection, but size-based rejection, waivers, and quota wording no longer
  apply.
- Narrows `document-for-agents:INV-8` and `document-for-agents:INV-17`: loading
  rows select relevant sources without a size veto, and resolution stays
  deterministic with exact declaration and status handling but no absolute cap.
- Orientation evidence records task band, resolved bytes, source count, and
  cache-gap state as description; no cap is reported as a validity condition.
- Harness check 11 becomes orientation-route validity (declared seams exist,
  resolved sources exist, manifest stays out of the set) with no size failure.
- Planning questions keep one decision per question and a clear recommendation
  without sentence, word, or alternative-count quotas. Risk classification and
  evidence stay; estimated-time sizing no longer splits or labels tickets.
- Historical decisions stay verbatim; this record carries the replacement, not
  a rewrite of prior caps.
