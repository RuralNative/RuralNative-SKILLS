<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Regenerated: #65 supervised execution · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md -->

# How information moves — in plain words

One unit of work, from first edit to final reader.

It starts when someone improves a skill: they edit the skill's folder and, in
the same sitting, update that skill's one-page technical summary so the two
never drift apart. For prose cleanup, the caller names the scope or a parent
skill passes it, including a repository sweep when requested, and unslopify
validates verbatim markers, inventories protected content such as code, frontmatter,
links, and verbatim ranges, optionally runs the Python advisory scanner that
masks protected and non-English regions before emitting repeatable evidence for
eight signals with versioned JSON and advisory thresholds (sentence and
paragraph uniformity share `AIT-STR-011` with level in evidence), scans
candidates across six families, judges each in context to reject exact technical
terms and quotations, rewrites only supported spans with minimal English-only
edits, and self-audits plus a preservation audit while leaving protected spans
byte for byte and reporting rejected candidates, scanner availability, and
needs-info items. The scanner never writes source, so a before-and-after hash
stays identical, and it exits zero for findings and nonzero for bad input
without partial JSON. When the change is a documentation workflow, that same
prose-quality contract is already active: `document-for-agents` and
`document-for-humans` load `unslopify` by skill identity before the first
user-visible prose and keep its protected-content and rewrite rules active while
drafting, then run a final `unslopify` audit on the exact prose the reader will
see and record the completion report. The parent skill owns scope — routine
maintenance passes only changed prose, an audit may pass a repository sweep —
and parent decisions including factual correctness, tier routing, glossary terms,
invariants, derivation rules, and approval gates outrank any style finding. If
`unslopify` is absent the parent workflow stops before user-visible prose with
`npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`; missing
Python does not stop it and the model-only path continues without weakening
scope or preservation, and installed runtime resolves by skill identity, not by
a repository-relative path, and behavior-based composition checks assert README
routing and install order without locking whole prose passages. The change is
maintained in the same diff: when code and docs conflict, code wins, the doc is
fixed and the discrepancy is flagged; changing the rule requires a new decision.
The change is pushed to the
shared trunk, where the
checker runs: it confirms every listed document exists, that changed code
arrived with its changed summary, and that every plain-language page is at
least as new as the documents it was made from. If any of that is false, the
push is told to stop.

From the trunk, the public registry picks the skill up: its discovery walks
the shelf of folders, and a consumer anywhere can install the skill with one
command. The install lands on the consumer's machine as a plain folder of
instructions their agent loads. When Python is absent the model-only path still
holds the full contract, advisory scanning never blocks the gate, and scanner
absence never weakens scope or preservation.

The people-side flow rides on top: the technical summaries, the decision
records, and the shared dictionary are the ingredients; an agent cooks them
into the plain-language pages — the overview, the decision journal, the
rules page, this story — and stamps each page with where it came from and
when. Those ingredients are authored docs only — decisions, glossary, seam
table, leaf docs, debt registry — never code, and never issues, commit
messages, or human-first docs. An issue stays a discussion link and a repo
without an accepted ADR leaves the journal dormant instead of mining commits.
Each derived page carries valid `Derived:` and `Sources:` headers, uses
one-way Bridge links for depth, and explains or links glossary terms on first
use. People read those pages, and when they want more, the one-way depth
links carry them into the technical pages, never the reverse.

The supervised coordinator flow rides above both adapters: the user invokes `/supervise-this <task>` with planning model+variant, implementation model+variant, and optional review model+variant, or `/supervise-this #<spec>` to resume; the supervisor checks that every required field is present and that review is either both omitted or both supplied, otherwise returns one ELI18 decision before any session, resolves every model name and variant through `agent_manager_models` accepting catalog names and qualified provider and model identifiers with no hard-coded allowlist, verifies each variant, shows the exact resolved planning, implementation, and review selections and waits for one confirmation, then starts planning as an Agent Manager local session with the confirmed planning model and variant and a delegated `plan-this` task without claiming to change the current Kilo session. The delegated planning session honors all `plan-this` approval gates and returns the published specification and ticket references; after publication the supervisor posts one structured parent comment recording the resolved planning, implementation, and review selections before implementation so a later resume can revalidate from GitHub. It then reads that structured model configuration recorded by #67 before starting implementation, records a fixed implementation review base on the parent before starting the first implementation worktree, computes the ready frontier containing only open child tickets with no open native blocker, the `ready-for-agent` label, and no assignee, and does not schedule blocked or assigned tickets. It creates one Agent Manager worktree per selected ticket and keeps no more than three implementation worktrees active, sending each worker one delegated `implement-this` issue plus the exact confirmed implementation model and variant. Every follow-up uses the same confirmed implementation selection, and the supervisor never replaces an unavailable implementation model or variant with an inherited or cheaper fallback. Live state comes from Agent Manager `list` for session IDs and states; the supervisor never edits `.kilo/agent-manager.json` or invents session and section IDs and does not copy the planning or implementation prefixes. A ticket counts as complete only when GitHub shows it closed, acceptance evidence exists, and its commit is reachable from `origin/main`; idle alone does not satisfy completion, and completed work frees a slot to start newly unblocked tickets in parent order. After all planned children land, the supervisor runs full repository verification `npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build`, then starts integrated `code-review` in a local Agent Manager session with the exact confirmed review model and variant, the recorded base, and #62 as authority. The final review session does not inherit the supervisor or implementation model unless that model is the recorded review selection. The supervisor posts parent evidence with all phase model selections, review base, checks, commits, ticket links, and review outcome, and closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding. Implementation and final-review model routing are explicit: every worker and every follow-up uses the confirmed implementation selection, every review session uses the confirmed review selection.

The planning adapter flow rides alongside: the skill accepts either a direct user invocation `/plan-this <task>` or narrow delegation from an active `supervise-this` run, places the task verbatim under `## Task:` as the single substitution point and delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslop` active before the first progress update, preserving the verbatim expected prefix — workflow line, eight Rules bullets, final summary line — with no wrapper markers or extra machinery and the same byte-for-byte body across both paths, rejecting unrelated invocation; standalone completion stops after the ELI18 summary while delegated completion returns the published parent specification and ticket references to the supervisor instead of ending the whole run, with no second planning contract, hard dependencies declared via that prefix plus frontmatter, not a separate section, file totals 18–35 lines. The implementation adapter flow does the same for tickets: a user invokes `/implement-this #<n>` directly or an active `supervise-this` run delegates one assigned issue in its dedicated Agent Manager worktree, the skill places the issue reference verbatim in place of `Issue #0` with the body after frontmatter equal to the exact prefix and a single `Issue #0` substitution point, and delegates to `/implement` → `/code-review` with `/unslop` active before the first progress update, preserving exact Git commands and the fixed prefix with no wrapper markers and no extra runtime, stopping if the assigned issue has an open native blocker and otherwise keeping worktree safety, verification, review, rebase, push, evidence, label removal, and single-ticket closure.

Where information rests: authored knowledge rests in the technical tree;
plain-language knowledge rests in the human pages, always one honest
regeneration behind its sources, never ahead of them.

depth: docs/leaves/document-for-agents.md · docs/leaves/document-for-humans.md · docs/leaves/unslopify.md · docs/leaves/plan-this.md · docs/leaves/implement-this.md · docs/leaves/supervise-this.md · docs/leaves/release-skills.md

<!-- regenerated: 2026-08-19 for #65 supervised execution -->

