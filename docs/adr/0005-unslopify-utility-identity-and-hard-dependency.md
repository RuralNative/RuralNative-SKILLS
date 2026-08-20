# 0005 — Unslopify as audience-neutral utility and hard dependency

Status: accepted
Date: 2026-08-19

Decision: `unslopify` ships as a repository-owned, audience-neutral skill identity: its `SKILL.md`
frontmatter `name` equals its folder `unslopify` with no audience suffix, replacing the external `unslop` dependency.
`document-for-agents` and `document-for-humans` declare it as a hard dependency, and `plan-this` and `implement-this` (slice #100) also declare it as a hard dependency loaded before the first progress update with scope, protected-content, preservation, and completion-report contracts. Agent work uses the focused doc-cache route `AGENTS.md → ARCHITECTURE.md → affected seam leaf doc → CONTEXT.md → relevant ADRs`; the agent cache is owned by `document-for-agents` and `document-for-humans` remains a derived, human-facing view that agents do not preload.

Why: the 31 AI-tell patterns apply unchanged to agent-facing and human-facing
prose. Forcing a suffix such as `unslopify-for-agents` would invent a false
distinction, split one behavior into two copies, and require synchronized
updates. A narrow utility exception keeps the behavior in one place while
leaving the verb-first, audience-suffixed default intact. Centralizing the
rules also avoids copying the same catalog into both documentation skills,
which would drift. The cost is coupled installation: the documentation skills
need `unslopify` present to satisfy the dependency.

Consequences:
- The glossary's skill naming convention carries a narrow exception for
  audience-neutral utilities, pointing to this decision.
- ADR-0004 remains accepted as the default; this decision does not permit
  router skills and does not change the flat shelf.
- The architecture index adds the `unslopify` seam, its leaf doc, and this ADR.
- Slice U4 (#44) wired the dependency, so both documentation skills now load
  `unslopify` before user-visible prose and run a final audit before
  publication; the entry points enforce the hard dependency.
- Failure mode when `unslopify` is absent is a clear install instruction;
  missing Python does not block completion because scanning remains advisory.
