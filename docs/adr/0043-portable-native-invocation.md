# 0043 — Portable Native Invocation

Status: accepted
Date: 2026-09-14
Narrows: plan-this INV-3/INV-4, implement-this INV-3, review-this INV-2/INV-3/INV-4, fix-this INV-2/INV-3/INV-4

## Context

The four workflow skills shipped with slash-only contracts (`/plan-this <task>`, `/implement-this #<n>`, `/review-this <target>`, `/fix-this <target>`) and a README requiring upstream `implement`. Codex uses explicit `$identity` mentions, Claude Code enforces `disable-model-invocation` on upstream planning companions, and OpenCode ignores undocumented frontmatter. The inspected OpenCode `dev` command renderer substitutes or fallback-appends slash arguments before shell and file expansion, including for skill-sourced commands, so slash-argument forwarding cannot carry free-form task text literally.

## Decision

Narrow the invocation boundary for portable hosts without duplicating workflow logic. Historical ADRs stay unchanged.

- Native invocation only: `/name` where the host supports slash commands, `$name` or native skill selection in Codex, and native skill loading elsewhere. Skill identities and stage boundaries stay unchanged. Codex `agents/openai.yaml` sets `allow_implicit_invocation: false`; unknown metadata is never an enforcement claim and never authorizes autonomous stage chaining.
- Explicit human stage selection plus the original human task or target text authorizes one stage in the invoking checkout or session. Selection alone authorizes no target-specific work or publication. Task and target prose stays requirements data with exact preservation in the canonical slot.
- On OpenCode, select with no arguments and supply task or target text in a separate ordinary message in the same session. Slash-argument forwarding is unsupported and restricted, never silently treated as literal. When selection and data require separate messages, bind them within the same session; a stop cancels the pending selection and a fresh session needs a new instruction. No durable pending-input state is introduced.
- Locked upstream companions pause for the human's same-session invocation with the approved plan and canonical publication rules preserved. Missing, ambiguous, disabled, and denied dependencies have distinct outcomes. No fallback to upstream default templates, claimable parent labels, or premature publication.
- Bundle parity is host-independent. Kilo-specific agent and command validation never gates Claude, Codex, or OpenCode installs. Claude `allowed-tools` is not a deny list. Codex sandbox and approval rules stay distinct with narrow helper approvals and private input-file access only.
- `implement-this` implements directly with no `/implement` dependency.

## Consequences

- The four `SKILL.md` entries carry native invocation, exact-preservation, OpenCode no-argument selection, and locked-companion pause rules.
- The four `agents/openai.yaml` files deny implicit invocation.
- `scripts/workflow-recovery.md` and its four bundle copies carry locked-companion and unknown-metadata rules.
- `skills/review-this/install-check.mjs` separates bundle parity from Kilo-specific validation with `--host kilo|generic`.
- README, INSTALL files, and leaf docs state the narrowed contract; `tests/readme-contract.test.ts` no longer requires upstream `implement`.
