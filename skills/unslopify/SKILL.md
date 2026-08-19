---
name: unslopify
description: >-
  Remove AI tells and clean up documentation prose. Use when writing reads as
  model-generated, needs plain-language cleanup, or before publishing docs.
  Does not classify authorship or detect AI content, it revises explicit prose
  you provide.
---

# unslopify — remove AI tells, keep meaning

Edit explicit prose to remove AI patterns and keep meaning. This is a
behavior-compatible baseline for the upstream `unslop` skill at
`99559f2f52047978602ef365589275831e76af07`. It applies only to prose you name
and preserves facts, scope, and tone unless you ask for a voice change.

## Scope — caller owns it

Standalone runs need an explicit scope: named files, ranges, or changed prose
the caller provides. Do not choose files on your own.

A parent skill may set a wider scope and that overrides the default. That
includes a requested repository sweep. When a parent passes scope, follow it
exactly. Never expand scope on your own. If no explicit scope and no parent
scope is given, stop and ask for scope instead of guessing.

## Protected content

Before detection, inventory protected content. The following is immutable unless
the caller explicitly includes it in scope: code fences and inline code, commands,
frontmatter, link destinations and anchors, Markdown structure such as headings,
list markers, blockquote markers, and table pipes, HTML comments, exact
quotations, citations, names, numbers, dates, units, glossary terms,
identifiers, and marked verbatim ranges. Markers such as
`<!-- unslopify:off -->` and `<!-- unslopify:on -->` are also protected.

Visible prose inside Markdown tables may be reviewed, but cell boundaries and
table syntax stay byte for byte. Frontmatter, link URLs, anchors, and comment
content are never rewritten.

## Verbatim markers

`<!-- unslopify:off -->` and `<!-- unslopify:on -->` protect a non-nesting
range. Ranges do not nest. Unmatched markers stop the pass instead of returning
partial output. An unmatched marker is invalid input, so stop the pass and
return no partial output. Report the unmatched marker location in the
completion report instead of continuing.

## Process

1. Resolve scope and inventory protected content. Validate verbatim markers.
2. Scan candidates. Judge each candidate in context for the patterns below.
3. Rewrite only spans supported by an accepted finding. Keep edits minimal.
4. Add soul only when requested or already present in the source voice (see below).
5. Self-audit and preservation audit. Publish the completion report.

## Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.
This layer is gated. Safe minimal rewrite is the default. Opinion, first person,
emotional reaction, and deliberate irregularity appear only when the caller asks
for them or when the source already uses that voice. When gated, keep the source
tone.

When voice is allowed:

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** "Impressive but also kind of unsettling" beats "impressive."
- **Use "I" when it fits.** First person isn't unprofessional.
- **Let some mess in.** Perfect structure looks machine-made.
- **Be specific.** Not "this is concerning" but "there's something unsettling about agents churning away at 3am."

When not allowed, do not add these.

## Patterns to detect and fix

Six families cover every upstream capability plus subtle structural tells.
Family codes are `LEX`, `STR`, `FMT`, `CONV`, `EVD`, `VOICE`. Each finding
carries a stable `AIT-<FAMILY>-<NNN>` identifier from `reference/parity.md`.

### Upstream 31 — retained

**Evidence and claims (EVD)**

1. **Puffery.** "pivotal moment", "testament to", "evolving landscape", "setting the stage for", "indelible mark", "deeply rooted". Cut puffery, state what happened. `AIT-EVD-001`
2. **Name-dropping.** Listing media outlets without context. Pick one, say what was said. `AIT-EVD-002`
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or record needs-info, do not invent one. `AIT-EVD-003`
24. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may". `AIT-EVD-004`
25. **Generic conclusions.** "The future looks bright." State specific plans or facts. `AIT-EVD-005`

**Structure and cadence (STR)**

3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources. `AIT-STR-001`
6. **Formulaic challenges.** "Despite challenges... continues to thrive." Replace with specific facts. `AIT-STR-002`
9. **"Not just X, but Y."** State the point directly instead. `AIT-STR-003`
10. **Rule of three.** Forcing ideas into groups of three. Use the natural number. `AIT-STR-004`
12. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly. `AIT-STR-005`
23. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted. `AIT-STR-006`
28. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two or drop clauses. One idea per sentence. `AIT-STR-007`
29. **Active voice.** Prefer it. Catch "is/are/was/were + past participle" and name the actor: "queries are validated" becomes "the compiler validates queries", "the file is parsed by the loader" becomes "the loader parses the file". Passive is fine only when the actor is unknown or genuinely doesn't matter. `AIT-STR-008`

**Lexical choice (LEX)**

4. **Promotional language.** "nestled", "vibrant", "breathtaking", "groundbreaking", "renowned", "stunning", "must-visit". Use neutral descriptions. `AIT-LEX-001`
7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words, unless the term is exact in context. `AIT-LEX-002`
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has". `AIT-LEX-003`
11. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it. `AIT-LEX-004`
26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, primitive (as noun), harness (as metaphor), surface (as in "API surface"), bedrock, scaffolding (as metaphor), modality, paradigm, gold-plating, ratchet (as metaphor), evacuate (for moving code), endgame, north star, flywheel. These read as technical but usually have a plainer concrete word. "Substrate" becomes "base". "Vector" becomes "way" or "method". Pick the concrete word only when the domain does not demand the term. `AIT-LEX-005`
30. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or the number. "significantly improves" becomes the measured delta. `AIT-LEX-006`
31. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if". `AIT-LEX-007`

**Formatting (FMT)**

13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). If a thought needs separation, end the sentence or use a comma. `AIT-FMT-001`
14. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing with the colon. Rewrite to let the point stand on its own. `AIT-FMT-002`
15. **Boldface overuse.** Don't bold every proper noun or acronym. `AIT-FMT-003`
16. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell. `AIT-FMT-004`
17. **Title case headings.** Use sentence case. `AIT-FMT-005`
18. **Decorative emojis.** Remove from headings and bullets. `AIT-FMT-006`
19. **Curly quotes.** Replace with straight quotes, unless a project style requires them. `AIT-FMT-007`

**Conversational residue (CONV)**

20. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove. `AIT-CONV-001`
21. **Cutoff disclaimers.** "While specific details are limited..." Find sources or remove. `AIT-CONV-002`
22. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly. `AIT-CONV-003`

**Voice or tone (VOICE)**

27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". If you can't restate it as a concrete instruction, fact, or number, cut it. If the sentence could appear unchanged in another project's docs, it says nothing about this one. `AIT-VOICE-001`

### Subtle structural and evidential tells — added

These extend the same six families:

- **Repeated sentence openers.** Three or more consecutive sentences starting with the same word or phrase such as "Additionally," or "Moreover,". `AIT-STR-009`
- **Repeated transition shape.** Same transition pattern every paragraph such as "Firstly... Secondly... Finally...". `AIT-STR-010`
- **Uniform rhythm.** Sentences or paragraphs of near-identical length throughout a section. Vary length. `AIT-STR-011`
- **Perfect bullet symmetry.** Every bullet is the same word count and clause shape. Allow natural variation. `AIT-STR-012`
- **Heading restatement.** First sentence of a section repeats the heading in different words. `AIT-STR-013`
- **Staged introductions.** A generic opening that sets the stage but adds no content such as "In today's fast-paced world...". Cut it. `AIT-STR-014`
- **Mechanical section symmetry.** Every section has the same heading-predicate-example-wrap shape. Break it. `AIT-STR-015`
- **Empty recaps.** A closing paragraph that restates the intro without new information or next steps. `AIT-EVD-006`
- **False neutrality.** Listing pros and cons with no stance when facts support one. `AIT-VOICE-002`
- **Unsupported confidence.** Strong claim with no evidence or citation such as "clearly optimal" without data. `AIT-EVD-007`
- **Claim laundering.** Turning a model-generated summary into a factual claim without a source. `AIT-EVD-008`
- **Generic benefits.** Vague value statements like "enhances productivity" without a mechanism or number. `AIT-EVD-009`
- **Cross-project swap test.** A sentence that could be pasted into another project's docs unchanged and still pass. If it could be swapped, it says nothing specific. `AIT-VOICE-003`

## Candidates, not verdicts

Pattern lists produce candidates. Context decides whether a candidate becomes a
finding.

- An exact technical term, quotation, project style rule, or domain vocabulary
  may reject a candidate. For example, `vector` in linear algebra or `primitive`
  in a language spec, em dashes when a style guide requires them, passive voice
  in a specification, or curly quotes when required.
- Protected content never becomes a finding.
- A missing source for a vague attribution is a finding flagged as `needs-info`.
  Do not invent a source or silently delete a claim that changes meaning.

## Language scope

v1 reviews English prose and leaves non-English passages unchanged. Mixed-language
documents may still have their English passages reviewed. Do not apply English
heuristics to non-English text.

## Rewrite contract

Safe minimal rewrite is the default. Change only spans supported by an accepted
finding. Preserve meaning, evidence, certainty, and causality. Do not add facts,
sources, numbers, or claims. Do not delete qualifications that change meaning.

Visible prose inside tables may be reviewed, but structure stays. Every edit
touches one finding and one span. Report changed spans and the changed-line
ratio in the completion report.

## Finding format and completion report

Every accepted finding reports its stable identifier, family, source span,
evidence, confidence, and action. A scanner finding also reports the measured
value and threshold when present.

The completion report states:

- scope used and how it was resolved (explicit, parent-supplied, or sweep)
- accepted findings with the fields above
- rejected candidates with reason (technical term, quotation, style, protected,
  domain vocabulary)
- scanner availability (present or absent)
- protected-content status (inventory and byte-equality)
- unresolved `needs-info` items
- preservation audit result
- changed spans and changed-line ratio

## Model-only path

The model-only path completes the full contract when Python is absent. No scanner
is required. Context review, protected-content checks, English-only handling,
minimal edits, and the preservation audit still hold. Scanner presence may improve
evidence consistency but never changes protection guarantees.

When a Python scanner is present, it is advisory only. It reports measurable
signals with evidence and never rewrites files or fails the gate because a style
signal was found.

## Preservation audit

After rewriting, compare the result against the protected-content inventory and
the source facts.

- Every protected span must be byte for byte identical unless the caller included
  it.
- Facts, qualifications, causality, and certainty must remain.
- Any unexplained change fails the pass. Revert or flag the change.

## Self-audit

Ask "What makes this obviously AI generated?" Fix remaining tells, then re-run
the preservation audit. The pass is done only when the rewrite is clean and the
audit is green.

## Provenance

Upstream source: https://github.com/cursor/plugins/tree/main/pstack/skills/unslop
Pinned commit: 99559f2f52047978602ef365589275831e76af07
See `NOTICE.md` and `reference/parity.md` for copyright, permission, and rule
mapping.

## Reference

- `reference/parity.md` — parity catalog mapping upstream rules 1..31 and
  extended subtle tells to local `AIT-*` identifiers.
- `NOTICE.md` — upstream copyright and MIT permission notice.
