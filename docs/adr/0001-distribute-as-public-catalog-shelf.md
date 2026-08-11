# 0001 — Distribute the skill as a public catalog shelf via the registry lane

Status: accepted
Date: 2026-08-11

Decision: The repository is a public distribution shelf. The skill lives at
`skills/<skill-identity>/` — the folder named for its declared skill identity,
`doc-architecture` — and the registry lane (`npx skills add
RuralNative/RuralNative-SKILLS --skill doc-architecture`) is the distribution
channel. MIT governs reuse.

Why: the repository was private and the skill sat at the root under a folder
name that did not match its declared skill identity. A private repository is
invisible to the registry's discovery engine, which lists repositories by
install telemetry and has no submission process. The catalog layout puts the
skill on the registry's primary discovery path. The registry lane was chosen
over npm packaging because the artifact is docs-only and the lane needs no
versioning ceremony.

Consequences:
- The repository must remain public; making it private removes the
  distribution channel.
- The copy-based install in `INSTALL.md` is a manual convenience, not a
  distribution channel — the registry lane remains canonical.
- Future skills join the shelf at `skills/<skill-identity>/`.
- Registry listing accrues from public install telemetry; the first install
  seeds it.
