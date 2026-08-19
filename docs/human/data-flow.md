<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/release-skills.md -->

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

The planning adapter flow rides alongside: a user invokes `/plan-this <task>`,
the skill places the task verbatim under `## Task:` and delegates to
`/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslop` active before the
first progress update, preserving the fixed prefix without extra runtime. The
implementation adapter flow does the same for tickets: a user invokes `/implement-this #<n>`, the skill places the issue reference verbatim in place of `Issue #0` with the body after frontmatter equal to the exact prefix and a single `Issue #0` substitution point, and delegates to `/implement` → `/code-review` with `/unslop` active before the first progress update, preserving exact Git commands and the fixed prefix with no wrapper markers and no extra runtime.

Where information rests: authored knowledge rests in the technical tree;
plain-language knowledge rests in the human pages, always one honest
regeneration behind its sources, never ahead of them.

depth: docs/leaves/document-for-agents.md · docs/leaves/document-for-humans.md · docs/leaves/unslopify.md · docs/leaves/plan-this.md · docs/leaves/implement-this.md · docs/leaves/release-skills.md

