# Classification — routing every claim to its tier

The routing question for any fact: **"Can an agent recover this by reading the
code?"**

- No → it is authored, on the lowest-decay tier that serves its reader.
- Yes → it is pointed to or derived, never restated.

| The fact answers… | It is a… | Tier | Stay-true mechanism |
|---|---|---|---|
| Why is the system shaped this way? | decision | ADR | append-only; supersession; parseable `Status:` |
| What does this term mean; what's forbidden? | vocabulary | glossary | frozen; changes require a decision |
| What must not change? (limits, exclusions, contracts) | invariant | seam leaf doc, numbered, 3–5 per seam | test where encodable — the drift test becomes a deletion |
| Where does X live? | pointer | index table / conventions | harness: table ↔ disk ↔ directories |
| What does the code say? (schema, endpoints, structure) | restatement | generated artifact, or absent | regeneration + timestamp gate |
| What are the cross-cutting rules? | policy | policy doc ≤ 1 page | linked from index; never restated in leaves |
| What are we doing right now? | work | issue tracker | deleted on completion; never cited |

## Notes

- **Specificity is orthogonal to decay.** An invariant ("batch limit is 4,
  enforced at the boundary") is maximally specific and slow-decaying. Never
  trade specificity for stability — trade *restatement* for it.
- **A pointer can be specific.** "The stream end marker is defined in
  `stream.ts` as `STREAM_END_MARKER`" — the fact in prose is *where*, which
  decays slowly; the value itself is code's job.
- **One home per fact.** If the same fact appears on two tiers, the duplicate
  decays at the faster rate and contradicts the slower one. Put it on the
  slower tier and point from the faster.
- **Exceptions are the only navigational prose worth writing.** Convention
  covers the rule; prose covers the one place the convention breaks, with the
  reason.
