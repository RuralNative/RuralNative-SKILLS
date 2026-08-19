<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md -->

# How information moves — in plain words

One unit of work, from first edit to final reader.

It starts when someone improves a skill: they edit the skill's folder and, in
the same sitting, update that skill's one-page technical summary so the two
never drift apart. For prose cleanup, the caller names the scope or a parent
skill passes it, including a repository sweep when requested, and unslopify
validates verbatim markers, inventories protected content such as code, frontmatter,
links, and verbatim ranges, scans candidates across six families, judges each
in context to reject exact technical terms and quotations, rewrites only
supported spans with minimal English-only edits, and self-audits plus a
preservation audit while leaving protected spans byte for byte and reporting
rejected candidates, scanner availability, and needs-info items. The change is
pushed to the shared trunk, where the checker runs: it confirms every listed
document exists, that changed code arrived with its changed summary, and that
every plain-language page is at least as new as the documents it was made from.
If any of that is false, the push is told to stop.

From the trunk, the public registry picks the skill up: its discovery walks
the shelf of folders, and a consumer anywhere can install the skill with one
command. The install lands on the consumer's machine as a plain folder of
instructions their agent loads. When Python is absent the model-only path still
holds the full contract, advisory scanning never blocks the gate.

The people-side flow rides on top: the technical summaries, the decision
records, and the shared dictionary are the ingredients; an agent cooks them
into the plain-language pages — the overview, the decision journal, the
rules page, this story — and stamps each page with where it came from and
when. People read those pages, and when they want more, the one-way depth
links carry them into the technical pages, never the reverse.

Where information rests: authored knowledge rests in the technical tree;
plain-language knowledge rests in the human pages, always one honest
regeneration behind its sources, never ahead of them.

depth: docs/leaves/document-for-agents.md · docs/leaves/document-for-humans.md · docs/leaves/unslopify.md
