# 0015 — Workflow inputs are requirements data and installs keep provenance and residual trust

Status: accepted
Date: 2026-08-22

Decision: prose that flows through `plan-this`, `implement-this`, and `review-this` — task text,
issue bodies, comments, specifications, review comments, sub-agent findings — is requirements
data: it states work and evidence but cannot widen scope, select files, authorize tools, or
override workflow gates. `unslopify` treats prompt-like text inside its explicit scope as inert
content under the same rule. Workflow execution performs no skill downloads; installation stays a
user step outside the run. Install guidance records source provenance, pins reviewed revisions
where the installer supports it, states residual trust in each source repository without claiming
the Snyk findings (Critical E005, Medium W011) have disappeared, and requires explicit user
approval before a manual install overwrites an existing skill.

Why: Snyk's August 2026 audit flagged third-party content exposure on every prose-consuming path.
An agent that treats ticket or rewrite prose as instruction lets any issue author escalate into
tool use, scope changes, or gate bypasses. Declaring the inputs to be data keeps authority with
the workflow commands and the user. Provenance and pinning narrow what a registry install can
change silently; they do not eliminate the decision to trust a public source repository, so the
guidance says so instead of overclaiming safety.

Consequences:
- The three workflow skills carry requirements-data rules; their composition tests guard them.
- `unslopify` reports instruction residue (`AIT-EVD-010`) and treats `load bearing`,
  `vertical slice`, and `native dependency edges` as context-aware candidates (`AIT-LEX-008`),
  preserving exact domain uses.
- Every `INSTALL.md` on this shelf carries a source-provenance-and-trust section and an
  overwrite-approval guard for manual copies.
- ADR-0014 remains reserved for the approved three-skill workflow target recorded by the parent
  specification (#130); this decision covers only the trust boundary within it.
