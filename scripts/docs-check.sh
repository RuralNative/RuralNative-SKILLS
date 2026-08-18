#!/usr/bin/env bash
# docs-check.sh — the doc-cache coherence gate for RuralNative-SKILLS.
# Implements the ten checks of skills/document-for-agents/reference/harness.md.
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

# Seam table (name | root | tests | doc).
mapfile -t SEAMS < <(awk -F'|' '/^\| / && $4 ~ /skills\// {gsub(/ /,"",$2); gsub(/ /,"",$4); gsub(/ +/," ",$5); gsub(/^ | $/,"",$5); gsub(/ /,"",$6); print $2 "|" $4 "|" $5 "|" $6}' "$ARCH")

# Same-diff freshness (check 2).
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  samdiff_fail=0
  for s in "${SEAMS[@]}"; do
    name="${s%%|*}"; rest="${s#*|}"; root="${rest%%|*}"; rest="${rest#*|}"; doc="${rest#*|}"
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
  name="${s%%|*}"; doc="${s##*|}"
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

# Seam-table completeness (check 6): every coverage doc is a seam doc or in the
# labeled non-seam section; every seam code root exists on disk.
mapfile -t NONSEAM < <(awk '/^## Non-seam docs/{f=1; next} /^## /{f=0} f && /^- / {sub(/^- /,""); gsub(/[[:space:]]/,""); print}' "$ARCH")
seam_docs=()
for s in "${SEAMS[@]}"; do seam_docs+=("${s##*|}"); done
table_fail=0
for f in "${COVERED[@]}"; do
  if ! grep -qxF "$f" <(printf '%s\n' "${seam_docs[@]}") && ! grep -qxF "$f" <(printf '%s\n' "${NONSEAM[@]}"); then
    bad "seam-table: coverage doc '$f' is in neither the seam table nor the non-seam list"; table_fail=1
  fi
done
for s in "${SEAMS[@]}"; do
  name="${s%%|*}"; rest="${s#*|}"; root="${rest%%|*}"
  [[ -d "$root" ]] || { bad "seam-table: code root '$root' does not exist on disk"; table_fail=1; }
done
[[ $table_fail -eq 0 ]] && note "seam-table: coverage <-> seam/non-seam tables match"

# Generated freshness (check 7): generated docs embed Generated: YYYY-MM-DD.
mapfile -t GEN < <(grep -lE '^Generated: [0-9]{4}-[0-9]{2}-[0-9]{2}$' "${COVERED[@]}" 2>/dev/null | sort -u)
gen_fail=0
if [[ ${#GEN[@]} -eq 0 ]]; then
  note "generated freshness: dormant (no generated docs)"
else
  threshold=30
  tline=$(grep -oE 'Freshness threshold: [0-9]+ days' "$ARCH" | head -1)
  [[ -n "$tline" ]] && threshold=$(grep -oE '[0-9]+' <<<"$tline" | head -1)
  today=$(date +%s)
  for g in "${GEN[@]}"; do
    d=$(grep -m1 -oE '^Generated: [0-9]{4}-[0-9]{2}-[0-9]{2}' "$g" | awk '{print $2}')
    age=$(( (today - $(date -d "$d" +%s)) / 86400 ))
    if (( age > threshold )); then
      bad "generated: '$g' is $age days old (threshold $threshold)"; gen_fail=1
    fi
  done
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    last_script_change=$(git log -1 --format=%cd --date=short -- scripts/ 2>/dev/null)
    for g in "${GEN[@]}"; do
      d=$(grep -m1 -oE '^Generated: [0-9]{4}-[0-9]{2}-[0-9]{2}' "$g" | awk '{print $2}')
      if [[ -n "$last_script_change" && "$last_script_change" > "$d" ]]; then
        bad "generated: '$g' not regenerated although scripts/ changed after it was generated"; gen_fail=1
      fi
      if [[ -n "$(git status --porcelain -- scripts/)" ]] && [[ -z "$(git status --porcelain -- "$g")" ]]; then
        bad "generated: '$g' not regenerated although scripts/ changed"; gen_fail=1
      fi
    done
  fi
  [[ $gen_fail -eq 0 ]] && note "generated freshness: all generated docs within threshold"
fi

# Policy coverage (check 8): policy docs linked from the index, both ways.
mapfile -t POLICIES < <(find docs/policies -name '*.md' -type f 2>/dev/null | sort)
mapfile -t POLICYROWS < <(awk -F'|' '/^\| [^|]+\.md \| policy \|/ {gsub(/ /,"",$2); print $2}' "$ARCH")
pol_fail=0
if [[ ${#POLICIES[@]} -eq 0 && ${#POLICYROWS[@]} -eq 0 ]]; then
  note "policy coverage: dormant (no policy docs)"
else
  for f in "${POLICIES[@]}"; do
    grep -qxF "$f" <(printf '%s\n' "${COVERED[@]}") || { bad "policy: '$f' on disk but not linked from the index"; pol_fail=1; }
  done
  for f in "${POLICYROWS[@]}"; do
    [[ -f "$f" ]] || { bad "policy: '$f' linked from the index but missing on disk"; pol_fail=1; }
  done
  [[ $pol_fail -eq 0 ]] && note "policy coverage: policies linked from the index"
fi

# Debt register (check 9): entries well-formed per entry; referenced DEBT-N ids
# declared.
DEBT_REG="docs/debt.md"
if [[ -f "$DEBT_REG" ]]; then
  debt_fail=0
  mapfile -t DEBTIDS < <(grep -oE '^### DEBT-[0-9]+' "$DEBT_REG" | awk '{print $2}')
  entries=$(grep -cE '^### DEBT-[0-9]+ — ' "$DEBT_REG")
  if [[ ${#DEBTIDS[@]} -eq 0 ]]; then
    bad "debt: register exists but has no DEBT-N entries"; debt_fail=1
  else
    if (( entries != ${#DEBTIDS[@]} )); then
      bad "debt: $(( ${#DEBTIDS[@]} - entries )) entries missing a title ('### DEBT-N — <title>')"; debt_fail=1
    fi
    while IFS= read -r bad_entry; do
      bad "debt: entry $bad_entry missing a Status or Revisit-when line"; debt_fail=1
    done < <(awk '
      /^### DEBT-[0-9]+/ { if (id != "" && (st != 1 || rw != 1)) print id; id=$2; st=0; rw=0; next }
      /^Status: (open|resolved)$/ { st=1 }
      /^Revisit-when:/ { rw=1 }
      END { if (id != "" && (st != 1 || rw != 1)) print id }
    ' "$DEBT_REG")
  fi
  for ref in $(grep -rhoE 'DEBT-[0-9]+' skills docs AGENTS.md ARCHITECTURE.md CONTEXT.md README.md 2>/dev/null | sort -u); do
    grep -qxF "$ref" <(printf '%s\n' "${DEBTIDS[@]}") || { bad "debt: '$ref' referenced but not declared in the register"; debt_fail=1; }
  done
  [[ $debt_fail -eq 0 ]] && note "debt: register complete (${#DEBTIDS[@]} entries)"
else
  note "debt register: dormant (no register yet)"
fi

# Invariant identifier integrity (check 10): per leaf doc, INV-N ids are
# unique; every INV-N referenced elsewhere in repo docs resolves to a
# declared id; tombstoned (Retired) ids satisfy no reference. Numbering gaps
# are not checked (gap-lenience).
inv_ids=(); inv_docs=(); inv_fail=0
for s in "${SEAMS[@]}"; do
  doc="${s##*|}"
  [[ -f "$doc" ]] || continue
  doc_ids=()
  while IFS= read -r line; do
    [[ "$line" == *".."* || "$line" == *"(Retired"* ]] && continue
    doc_ids+=($(grep -oE 'INV-[0-9]+' <<<"$line"))
  done < "$doc"
  for id in $(printf '%s\n' "${doc_ids[@]}" | sort | uniq -d); do
    bad "invariant: duplicate $id in $doc"; inv_fail=1
  done
  for id in $(printf '%s\n' "${doc_ids[@]}" | sort -u); do
    inv_ids+=("$id"); inv_docs+=("$doc")
  done
done
if [[ ${#inv_ids[@]} -eq 0 ]]; then
  note "invariant integrity: dormant (no invariants yet)"
else
  mapfile -t INVSCAN < <({ find docs -name '*.md' -type f; printf '%s\n' AGENTS.md ARCHITECTURE.md CONTEXT.md README.md; } | sort)
  for f in "${INVSCAN[@]}"; do
    [[ -f "$f" ]] || continue
    while IFS= read -r line; do
      [[ "$line" == *".."* || "$line" == *"(Retired"* ]] && continue
      for id in $(grep -oE 'INV-[0-9]+' <<<"$line" | sort -u); do
        declared=0; owns=0
        for k in "${!inv_ids[@]}"; do
          if [[ "${inv_ids[$k]}" == "$id" ]]; then
            declared=1
            [[ "${inv_docs[$k]}" == "$f" ]] && owns=1
          fi
        done
        [[ $owns -eq 1 ]] && continue
        [[ $declared -eq 1 ]] || { bad "invariant: '$id' referenced in $f but not declared"; inv_fail=1; }
      done
    done < "$f"
  done
  inv_count=$(printf '%s\n' "${inv_ids[@]}" | wc -l | tr -d ' ')
  [[ $inv_fail -eq 0 ]] && note "invariant: ids unique and references resolve ($inv_count invariants)"
fi

# Human-docs extension (spec #28): read-set absence, link direction, and
# derived freshness for docs/human/. Dormant until the human tree has docs.
mapfile -t HUMAN < <(find docs/human -name '*.md' -type f 2>/dev/null | sort)
human_fail=0
if [[ ${#HUMAN[@]} -eq 0 ]]; then
  note "human docs: dormant (none yet)"
else
  # Read-set absence: no loading-protocol/read-set row names docs/human/.
  readset_hit=0
  loading=$(awk '/^## Loading protocol/{f=1; next} /^## /{f=0} f' "$ARCH")
  [[ -n "$(grep -F 'docs/human/' <<<"$loading")" ]] && readset_hit=1
  orientation=$(awk '/^## Documentation \(doc-cache\)/{f=1; next} /^## /{f=0} f' AGENTS.md)
  [[ -n "$(grep -F 'docs/human/' <<<"$orientation")" ]] && readset_hit=1
  if [[ $readset_hit -eq 1 ]]; then
    bad "human docs: a loading-protocol/read-set row names docs/human/"; human_fail=1
  fi
  # Link direction: no markdown link into docs/human/ from outside the tree.
  # Matches inline links, angle-bracket targets, ../ or ./ or absolute-relative
  # paths, and reference-style definitions; prose mentions without a link pass.
  mapfile -t OUTSIDE < <({ find docs -path 'docs/human' -prune -o -name '*.md' -type f -print; printf '%s\n' AGENTS.md "$ARCH" CONTEXT.md README.md; find skills -name '*.md' -type f; } | sort)
  for f in "${OUTSIDE[@]}"; do
    [[ -f "$f" ]] || continue
    if grep -qE '\]\(<?((\.\./|\./|/)*docs/human/|(\.\./|\./)+human/)|^\[[^]]+\]:[[:space:]]*<?((\.\./|\./|/)*docs/human/|(\.\./|\./)+human/)' "$f"; then
      bad "human docs: link into docs/human/ from '$f'"; human_fail=1
    fi
  done
  # Derived freshness: a source committed after the stamp, or dirty in the
  # working tree while its derived doc is untouched, fails.
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    for f in "${HUMAN[@]}"; do
      header=$(head -10 "$f")
      stamp=$(grep -m1 -oE 'Derived: [0-9]{4}-[0-9]{2}-[0-9]{2}' <<<"$header" | awk '{print $2}')
      if [[ -z "$stamp" ]]; then
        bad "human docs: '$f' missing a Derived: YYYY-MM-DD stamp"; human_fail=1
        continue
      fi
      sources=$(grep 'Sources:' <<<"$header" | sed -E 's/^.*Sources:[[:space:]]*//; s/[[:space:]]*-->[[:space:]]*$//')
      IFS=',' read -ra srcs <<< "$sources"
      for src in "${srcs[@]}"; do
        src="$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' <<<"$src")"
        [[ -n "$src" ]] || continue
        last=$(git log -1 --format=%cd --date=short -- "$src" 2>/dev/null)
        if [[ -n "$last" && "$last" > "$stamp" ]]; then
          bad "human docs: '$f' stale — source '$src' committed $last after its Derived stamp $stamp"; human_fail=1
        fi
        if [[ -n "$(git status --porcelain -- "$src")" ]] && [[ -z "$(git status --porcelain -- "$f")" ]]; then
          bad "human docs: '$f' not regenerated although source '$src' is modified"; human_fail=1
        fi
      done
    done
  else
    note "human docs: derived freshness skipped (not a git work tree)"
  fi
  [[ $human_fail -eq 0 ]] && note "human docs: ${#HUMAN[@]} docs fresh"
fi

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
inv_list=""
for s in "${SEAMS[@]}"; do
  name="${s%%|*}"; rest="${s#*|}"; rest="${rest#*|}"; tests="${rest%%|*}"; doc="${s##*|}"
  [[ -f "$doc" ]] || continue
  tests_loc=()
  for t in $(printf '%s' "$tests" | grep -oE '[^[:space:];,]+' | tr -d '`*'); do
    case "$t" in
      */*) [[ -e "$t" ]] && tests_loc+=("$t") ;;
    esac
  done
  for i in $(grep -vE '\.\.|\(Retired' "$doc" | grep -oE 'INV-[0-9]+' | sort -u); do
    enc=0
    for t in "${tests_loc[@]}"; do
      grep -rqF "$i" "$t" 2>/dev/null && { enc=1; break; }
    done
    if (( enc )); then
      inv_list="$inv_list $name:$i(enc)"
    else
      inv_list="$inv_list $name:$i(prose)"
    fi
  done
done
debt_open=0; debt_resolved=0
if [[ -f "$DEBT_REG" ]]; then
  debt_open=$(grep -cE '^Status: open$' "$DEBT_REG")
  debt_resolved=$(grep -cE '^Status: resolved$' "$DEBT_REG")
fi
printf 'scorecard: docs %d/%d (%d%%), seams %d, invariants:%s, ADRs accepted %d / superseded %d / rejected %d, debt open %d / resolved %d, human docs %d\n' \
  "$covered" "$ondisk" "$pct" "${#SEAMS[@]}" "$inv_list" "$adr_accepted" "$adr_superseded" "$adr_rejected" "$debt_open" "$debt_resolved" "${#HUMAN[@]}"

exit "$fail"
