# 0018 — Opt-in skill diagnostics

Status: accepted
Date: 2026-08-23

Decision: `document-for-agents` may keep one private diagnostics record of
confirmed agent mistakes, but only under this contract. No file is created
before the owner gives explicit consent to create and maintain it. Initial
consent covers later maintenance; every later write still gets a clear prior
notice naming what category of information will be added and stating that
sensitive details will be removed. Revocation stops writes immediately, then
asks whether to keep, export, or delete the existing file; the skill never
deletes it without that separate choice.

The record is one append-only local file outside the doc cache and version
control by default, excluded from every normal agent read set, and never task
guidance. It is evidence for optional user-reviewed submission to the skill
developer — not policy, debt, an invariant, or task guidance. Only mistakes
confirmed by the user or proved from the prompt, code, checks, or docs enter
it, as sanitized summaries with approved fields: category, intended outcome in
paraphrase, observed mistake, impact, correction, relevant documentation role,
available skill revision, attribution confidence, and redactions applied.
Entries omit raw prompts, code, secrets, personal data, absolute paths,
repository remotes, and proprietary names, describe evidence and correction,
and never become a general prohibition or instruction. No upload, network
call, or telemetry is added; the user reviews the file before any manual
submission.

Generated `AGENTS.md` also carries one protected management marker directly
after the five commands, an HTML comment recording the `document-for-agents`
skill identity and available revision evidence. Provenance states are
`confirmed` only when the marker plus supporting evidence backs it; older or
ambiguous documents get `likely` or `unknown`, never guessed certainty.

Why: users had no safe record of where the lifecycle's guidance failed, and a
useful record risks becoming an accidental disclosure or a source of bad
instructions for future agents. Consent gating, per-write notice, and a
separate disposition choice keep maintenance visible and deletion never
assumed; privacy, sanitization, and read-set exclusion keep the file inert;
cautious provenance keeps attribution honest about what evidence can prove.

Consequences:
- The seam leaf declares INV-14 and INV-15 with composition tests and the
  hostile `diagnostics-entry.json` fixture in `skills/document-for-agents/tests/`.
- The index template defines the marker shape and provenance classification;
  the diagnostics entry template defines the approved sanitized fields.
- This repository adopts the contract in the same change: one marker after the
  five commands in `AGENTS.md`, glossary terms Skill diagnostics and
  Management marker, public routing text, and regenerated derived human pages.
- The harness stays at ten checks; these behaviors are review-level
  contracts enforced by composition tests, not an eleventh gate.
