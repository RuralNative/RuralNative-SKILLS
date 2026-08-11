#!/usr/bin/env bash
# docs-check.sh — the doc-cache coherence gate for RuralNative-SKILLS.
# Tooling: exempt from demanding its own doc (see ARCHITECTURE.md, Checks).
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
ARCH="ARCHITECTURE.md"
fail=0
note() { printf '  ok   %s\n' "$*"; }
bad()  { printf '  FAIL %s\n' "$*"; fail=1; }

# Coverage <-> disk (check 1).
mapfile -t COVERED < <(grep -oE '^\| [^|]+\.md' "$ARCH" | sed -E 's/^\| //; s/[[:space:]]*$//' | sort -u)
mapfile -t ONDISK < <({ find docs -name '*.md' -type f; printf '%s\n' CONTEXT.md README.md; } | sort)
missing=0
for f in "${COVERED[@]}"; do [[ -f "$f" ]] || { bad "coverage: listed but not on disk — $f"; missing=1; }; done
unlisted=0
for f in "${ONDISK[@]}"; do
  grep -qxF "$f" <(printf '%s\n' "${COVERED[@]}") || { bad "coverage: on disk but not listed — $f"; unlisted=1; }
done
[[ $missing -eq 0 && $unlisted -eq 0 ]] && note "coverage: table <-> disk match"

# Seam table (name | root | doc).
mapfile -t SEAMS < <(awk -F'|' '/^\| / && $4 ~ /skills\// {gsub(/ /,"",$2); gsub(/ /,"",$4); gsub(/ /,"",$6); print $2 "|" $4 "|" $6}' "$ARCH")

# Same-diff freshness (check 2).
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  samdiff_fail=0
  for s in "${SEAMS[@]}"; do
    name="${s%%|*}"; rest="${s#*|}"; root="${rest%%|*}"; doc="${rest#*|}"
    if [[ -n "$(git status --porcelain -- "$root")" ]] && [[ -z "$(git status --porcelain -- "$doc")" ]]; then
      bad "same-diff: '$root' changed but '$doc' did not"; samdiff_fail=1
    fi
  done
  [[ $samdiff_fail -eq 0 ]] && note "same-diff: seams change with their leaf docs"
else
  note "same-diff: skipped (not a git work tree)"
fi

# New seam requires a doc + identity == folder (check 3).
seam_names=()
for s in "${SEAMS[@]}"; do seam_names+=("${s%%|*}"); done
for d in skills/*/; do
  [[ -d "$d" ]] || continue
  d="${d%/}"
  name="$(basename "$d")"
  grep -qxF "$name" <(printf '%s\n' "${seam_names[@]}") || bad "new seam: '$name' has no row in the seam table"
  [[ -f "$d/SKILL.md" ]] && grep -qx "name: $name" "$d/SKILL.md" || bad "identity: '$d/SKILL.md' name must equal folder '$name'"
done
for s in "${SEAMS[@]}"; do
  name="${s%%|*}"; rest="${s#*|}"; doc="${rest#*|}"
  [[ -f "$doc" ]] || bad "seam '$name': leaf doc missing — $doc"
done
[[ $fail -eq 0 ]] && note "seams: every skills/ dir has a row and a leaf doc"

# ADR status parse (check 4).
for f in docs/adr/*.md; do
  [[ -f "$f" ]] || continue
  grep -qE '^Status: (accepted|superseded|rejected)$' "$f" || bad "ADR: no parseable Status line — $f"
  if grep -q '^Status: superseded' "$f" && grep -vE '^\| [^|]+\.md' "$ARCH" | grep -qF "$(basename "$f")"; then
    bad "ADR: superseded but referenced as current by $ARCH — $f"
  fi
done
[[ $fail -eq 0 ]] && note "ADR: statuses parse"

# Work-doc expiry (check 5): default policy — work docs do not live in the repo.
if grep -rEq '^Expires:' "${COVERED[@]}" 2>/dev/null; then
  bad "work-doc policy: a covered doc carries 'Expires:' — work docs live in the issue tracker"
fi
note "work docs: none in the repo"

# Scorecard.
adr_accepted=0; adr_superseded=0; adr_rejected=0
for f in docs/adr/*.md; do
  [[ -f "$f" ]] || continue
  case "$(grep -m1 '^Status:' "$f" | cut -d' ' -f2)" in
    accepted) adr_accepted=$((adr_accepted+1)) ;;
    superseded) adr_superseded=$((adr_superseded+1)) ;;
    rejected) adr_rejected=$((adr_rejected+1)) ;;
  esac
done
ondisk=${#ONDISK[@]}; covered=${#COVERED[@]}
[[ $ondisk -gt 0 ]] && pct=$((covered*100/ondisk)) || pct=100
printf 'scorecard: docs %d/%d (%d%%), seams %d, ADRs accepted %d / superseded %d / rejected %d\n' \
  "$covered" "$ondisk" "$pct" "${#SEAMS[@]}" "$adr_accepted" "$adr_superseded" "$adr_rejected"

exit "$fail"
