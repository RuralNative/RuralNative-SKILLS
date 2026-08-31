# 0026 — Unslopify publication stays silent

Status: accepted
Narrows: 0016 (visible publication-report clause only)
Date: 2026-08-31

Decision: under the always-on contract, the completion report and the
preservation audit are retained but no longer appended at publication
boundaries. Normal chat and published workflow prose — documents,
specifications, tickets, progress updates, recommendations, decisions, and
GitHub comments — run the same cleanup silently, and published content
carries no audit block. An explicit rewrite-audit request still returns the
full findings and preservation report. Protected-content rules, the
inert-input boundary, technical fidelity, and scanner behavior do not change.

Why: the report after every progress update, question, decision, and
published artifact added noise to routine workflow prose. The check stays
active everywhere and the report moves behind an explicit ask, so reading a
ticket or update no longer requires wading through an audit block to reach
the content. Specification #183 narrows the visible publication-report part
of ADR-0016 while keeping the always-on scope, silent chat, inert user text,
and technical fidelity intact.

Consequences:
- ADR-0016 stays accepted; only its visible publication-report clause is
  narrowed.
- The unslopify `SKILL.md` Live output, Process, and completion-report
  sections state silent publication plus the explicit-audit return path.
- Composition tests cover silent chat, silent published artifacts, and an
  explicit audit returning the full report.
- The glossary Always-on scope entry and the unslopify leaf non-negotiable
  INV-7 cite this decision.
- The derived human data-flow page and the public README behavior and shelf
  text update in the same change.