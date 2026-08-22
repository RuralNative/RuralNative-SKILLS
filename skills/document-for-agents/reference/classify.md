# Classification — routing every claim to its tier

The routing question for any fact: **"Can an agent recover this by reading the
code?"**

- No → it is authored, on the lowest-decay tier that serves its reader.
- Yes → it is pointed to or derived, never restated.

| The fact answers… | It is a… | Tier | Stay-true mechanism |
|---|---|---|---|
| Why is the system shaped this way? | decision | ADR | append-only; supersession; parseable `Status:` |
| What does this term mean; what's forbidden? | vocabulary | glossary | frozen; changes require a decision |
| What must not change? (limits, exclusions, contracts) | invariant | seam leaf doc, numbered, 3–5 at establishment, grows with decisions; audit past ~15 | test where encodable — the identifier appears literally under the seam's declared test location, so the drift test becomes a deletion; otherwise prose, with a justification naming its mechanism |
| Where does X live? | pointer | index table / conventions | harness: table ↔ disk ↔ directories |
| What does the code say? (schema, endpoints, structure) | restatement | generated artifact, or absent | regeneration + timestamp gate |
| What are the cross-cutting rules? | policy | policy doc ≤ 1 page | linked from index; never restated in leaves |
| What is knowingly unfinished or a shortcut? | debt | debt registry | `DEBT-N` ids, `Status:`, `Revisit-when:` triggers, reviewable in diffs |
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
- **The avoid-list is a negative specification.** The glossary carries a
  per-term `_Avoid:` list of forbidden synonyms, stating what the term is not.
- **Naming violations are reviewable in every diff.** The avoid-list turns
  vocabulary drift into a review finding.
- **New terms land with their avoid-list.** A new term (with its `_Avoid:`
  list) enters the glossary in the same change that introduces it.
- **Vocabulary is frozen.** Glossary changes require a decision.
- **Debt is a claim about the present.** A debt entry says "this shortcut is
  acceptable now"; its `Revisit-when:` trigger is the stay-true mechanism.
  Maturity is a review act, not a parse. Resolved entries keep history,
  pointing at the paying change — like ADR supersession.
- **Invariants have a lifecycle.** Tier declared at birth; retirement is a
  tombstone (`(Retired — <decision id>)`) tied to a decision — never deleted,
  never renumbered except recorded duplicate repair.
- **Missing rules are born in official structures.** When the skill is silent,
  a new rule lands in the adopting repo's policy, decision record, or glossary
  — never a side channel; gaps generic enough to recur feed back into this
  skill.
- **Repository review guidance is policy.** A root `REVIEW.md` stating review
  scope, severity, trust rules, verification expectations, current-head
  freshness, duplicate handling, evidence requirements, and subagent rules
  routes to the policy tier: linked from the index, never restated in leaves,
  and updated in the same change as the rules it states. Cloud review tools
  read this file from the pull-request base branch; configuring the tool
  itself is platform setup, not part of the doc cache.

- **Sizing controls artifact set.** Minimal fits a repo one session can hold:
  index, glossary, one conventions policy. No per-seam leaf doc, ADR directory,
  generated-doc directory, or harness yet. Standard adds a leaf doc per seam and
  ADRs as decisions land. Full adds the harness, generated artifacts, and
  scorecard. A dormant category creates no file and its harness checks stay
  dormant. Cross the threshold only on verified need: more seams, durable
  decisions, or a coordination cost that the check would have caught.

