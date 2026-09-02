# Classification — routing every claim to its tier

The routing question for any fact: **"Can an agent recover this by reading the
code?"**

- No → it is authored, on the lowest-decay tier that serves its reader.
- Yes → it is pointed to or derived, never restated.

| The fact answers… | It is a… | Tier | Stay-true mechanism |
|---|---|---|---|
| Why is the system shaped this way? | decision | ADR | append-only; supersession; parseable `Status:` |
| What does this term mean; what's forbidden? | vocabulary | glossary | frozen; changes require a decision |
| What must not change? (limits, exclusions, contracts) | invariant | seam leaf doc, numbered, 3–8 at establishment, grows with decisions; audit past ~23 | test where encodable — the identifier appears literally under the seam's declared test location, so the drift test becomes a deletion; otherwise prose, with a justification naming its mechanism |
| Where does X live? | pointer | index table / conventions | harness: table ↔ disk ↔ directories |
| What does the code say? (schema, endpoints, structure) | restatement | generated artifact, or absent | regeneration + timestamp gate |
| What are the cross-cutting rules? | policy | policy doc ≤ 105 lines | linked from index; never restated in leaves |
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

- **Sizing controls artifact set, and the governor keeps it sized.** Minimal
  fits a repo one session can hold: index, glossary, one conventions policy. No
  per-seam leaf doc, ADR directory, generated-doc directory, or harness yet.
  Standard adds a leaf doc per seam, ADRs as decisions land, the applicable
  policy docs, the coverage manifest, an active seam fingerprint per documented
  seam, and the harness wired into the normal check path. Full adds generated
  artifacts, package-local indexes, declared orientation routes, and the
  scorecard. A dormant category creates no file and its harness checks stay
  dormant. The tier is not a one-time guess: the preflight re-evaluates evidence
  on every branch and promotes automatically and additively when it crosses the
  threshold, and never demotes automatically (ADR-0028).
- **The tier governor promotes on evidence, not counts.** minimal→standard fires
  on the first ADR-worthy durable decision or more than one independently
  editable seam; standard→full fires on a review-confirmed code/doc
  contradiction, multi-agent or multi-package coordination, or a code-derived
  artifact that would replace high-decay restatement. A fingerprint mismatch is
  drift evidence only after a review proves a false claim. The `governance.ts`
  reference implementation resolves the required tier and the monotonic
  promotion deterministically.
- **Seam coherence is the invariant tier's stay-true mechanism at the seam
  level.** Harness check 2 stores a canonical code fingerprint of each
  documented seam's code root in the coverage manifest's `Seam verification`
  table and fails while it is stale, in a dirty worktree or a clean checkout
  alike. It replaces touch-only same-diff freshness: a leaf edit that does not
  review the claims and refresh the fingerprint stays red, and a reviewed
  no-text-change may refresh (ADR-0028).
- **A clarification record recovers lost rationale from evidence only.** A
  legacy ADR missing trustworthy reasons gets a separate accepted `Clarifies:`
  record citing repository or tracker evidence; the original stays verbatim.
  With insufficient evidence the rationale is a cache gap marked `unknown`, never
  invented (ADR-0028).
- **Coverage inventory is manifest-owned.** When a repository runs the
  harness, the exhaustive tier and coverage inventory lives in the
  harness-owned coverage manifest, excluded from every orientation set; the
  architecture index stays a compact seam index (ADR-0024).
- **Orientation sets resolve at runtime.** A command resolves its orientation
  set from affected seams, the compact architecture index, whole bounded
  leaves, leaf-named glossary entries, and only the decisions and policies a
  leaf marks with an explicit `— requires.` declaration; a compact citation —
  a bare `- Decision:` or `- Policy:` bullet or a prose mention — stays visible
  navigation and never loads source content (ADR-0025). Byte caps are hard,
  duplicate sources count once, rejected decisions never enter the set even
  when declared required, superseded ADRs load only when a leaf explicitly
  requires them, and no set exceeds 18,000 bytes (ADR-0024, ADR-0025,
  ADR-0030).
- **Improve repairs existing caches.** Audit stays read-only. Improve
  diagnoses an existing cache, shows one complete migration preview, waits for
  one explicit approval, and only then applies trims, additions, moves,
  deletions, coverage-manifest changes, and generated-doc actions — finishing
  only after the prose audit and harness pass. It routes durable decisions and
  vocabulary to their tiers and removes code-recoverable restatement and work
  history before considering a seam split.
- **Seam splits need independent life.** Propose a split only when code
  ownership, invariants, entry points, and change cadence are independently
  meaningful for each half — never only because a leaf is long.
- **Skill diagnostics are outside every tier.** The private mistake record and
  its private consent-state record are not doc-cache tier artifacts: no routing
  row classifies them, they never enter a read set or an orientation set, and
  they never become policy, debt, an invariant, or guidance. Their shape lives in
  `reference/templates.md` under the skill diagnostics entry and the
  consent-state record; their consent checkpoint lives in `SKILL.md`.

