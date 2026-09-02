#!/usr/bin/env bash
# docs-check.sh — the doc-cache coherence gate for RuralNative-SKILLS.
# Implements the eleven checks of skills/document-for-agents/reference/harness.md.
# Tooling: exempt from demanding its own doc (see ARCHITECTURE.md, Checks).
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
ARCH="ARCHITECTURE.md"
MANIFEST="docs/manifest.md"
fail=0
note() { printf '  ok   %s\n' "$*"; }
bad()  { printf '  FAIL %s\n' "$*"; fail=1; }

# seam_fp — canonical SHA-256 of a seam's VCS-visible code root (tracked plus
# non-ignored untracked). Each file contributes `path<TAB>type<TAB>size<TAB>hash`
# (f=file bytes, l=symlink target, g=other present, d=listed-absent), entries
# sort by path, each line ends in a newline, and the joined preimage is hashed.
# Byte-for-byte the algorithm governance.ts implements, so a manifest digest and
# a live digest agree (document-for-agents:INV-20).
seam_fp() {
  local root="$1"
  { git ls-files -c -- "$root" 2>/dev/null; git ls-files -o --exclude-standard -- "$root" 2>/dev/null; } \
    | LC_ALL=C sort -u \
    | while IFS= read -r p; do
        if [[ -L "$p" ]]; then
          tgt=$(readlink "$p"); sz=$(printf '%s' "$tgt" | wc -c | tr -d ' '); h=$(printf '%s' "$tgt" | sha256sum | cut -d' ' -f1); t=l
        elif [[ -f "$p" ]]; then
          sz=$(wc -c < "$p" | tr -d ' '); h=$(sha256sum "$p" | cut -d' ' -f1); t=f
        elif [[ -e "$p" ]]; then
          sz=0; h=$(printf '' | sha256sum | cut -d' ' -f1); t=g
        else
          sz=0; h=$(printf '' | sha256sum | cut -d' ' -f1); t=d
        fi
        printf '%s\t%s\t%s\t%s\n' "$p" "$t" "$sz" "$h"
      done | LC_ALL=C sort | sha256sum | cut -d' ' -f1
}

# Coverage <-> disk (check 1). The exhaustive tier and coverage inventory lives
# in the harness-owned manifest when present; legacy repositories without the
# manifest stay diagnosable against the index's coverage table.
if [[ -f "$MANIFEST" ]]; then COVERAGE_SRC="$MANIFEST"; else COVERAGE_SRC="$ARCH"; fi
mapfile -t COVERED < <(grep -oE '^\| [^|]+\.md' "$COVERAGE_SRC" | sed -E 's/^\| //; s/[[:space:]]*$//' | sort -u)
mapfile -t ONDISK < <({ find docs -name '*.md' -type f; for f in CONTEXT.md README.md REVIEW.md reference/vendor-facts.md; do [[ -f $f ]] && printf '%s\n' "$f"; done; } | sort)
missing=0
for f in "${COVERED[@]}"; do [[ -f "$f" ]] || { bad "coverage: listed but not on disk — $f"; missing=1; }; done
unlisted=0
for f in "${ONDISK[@]}"; do
  grep -qxF "$f" <(printf '%s\n' "${COVERED[@]}") || { bad "coverage: on disk but not listed — $f"; unlisted=1; }
done
[[ $missing -eq 0 && $unlisted -eq 0 ]] && note "coverage: table <-> disk match"

# Seam table (name | root | tests | doc).
mapfile -t SEAMS < <(awk -F'|' '/^\| / && $4 ~ /skills\// {gsub(/ /,"",$2); gsub(/ /,"",$4); gsub(/ +/," ",$5); gsub(/^ | $/,"",$5); gsub(/ /,"",$6); print $2 "|" $4 "|" $5 "|" $6}' "$ARCH")

# Seam coherence (check 2): each documented seam's stored code fingerprint must
# match a fresh digest of its code root. A stale or missing fingerprint fails in
# a dirty worktree and a clean CI checkout alike, because the comparison is
# content against a stored digest, not git status. Dormant until the manifest
# carries a Seam verification table; a standard/full declared tier that omits
# the table, or a documented seam without a row in it, is a failure, because the
# standard tier arms this protection.
tier=$(grep -oE '^Documentation tier:[[:space:]]*(minimal|standard|full)' "$ARCH" | head -1 | awk '{print $NF}')
ver_ok=0; ver_total=${#SEAMS[@]}
if [[ -f "$MANIFEST" ]] && grep -q '^## Seam verification' "$MANIFEST"; then
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    note "seam coherence: skipped (not a git work tree)"
  else
    ver_fail=0
    declare -A present=()
    while IFS='|' read -r _ name _root stored verified _claims; do
      name=$(sed -E 's/^ +| +$//g' <<<"$name")
      [[ "$name" =~ ^[a-z0-9-]*[a-z][a-z0-9-]*$ ]] || continue
      present[$name]=1
      stored=$(sed -E 's/^ +| +$//g' <<<"$stored")
      verified=$(sed -E 's/^ +| +$//g' <<<"$verified")
      root=$(awk -F'|' -v n="$name" '/^\| / {gsub(/ /,"",$2); gsub(/ /,"",$4); if($2==n) print $4}' "$ARCH")
      if [[ -z "$root" ]]; then bad "coherence: seam '$name' has no code root in the index"; ver_fail=1; continue; fi
      if [[ -z "$verified" || "$verified" == *'---'* ]]; then bad "coherence: seam '$name' has no Verified date"; ver_fail=1; continue; fi
      cur=$(seam_fp "$root")
      want=${stored#sha256:}
      if [[ -z "$stored" || "$cur" != "$want" ]]; then
        bad "coherence: seam '$name' fingerprint stale — expected sha256:$cur, recorded ${stored:-none}; review its claims then refresh"; ver_fail=1
      else
        ver_ok=$((ver_ok+1))
      fi
    done < <(awk '/^## Seam verification/{f=1;next} /^## /{f=0} f && /^\|/' "$MANIFEST")
    for s in "${SEAMS[@]}"; do
      name=${s%%|*}
      if [[ -z "${present[$name]:-}" ]]; then
        bad "coherence: documented seam '$name' has no Seam verification row in the manifest"; ver_fail=1
      fi
    done
    if [[ $ver_fail -eq 0 ]]; then
      note "coherence: $ver_ok/$ver_total seam fingerprints verified"
    else
      bad "coherence: $ver_ok of $ver_total documented seams verified"
    fi
  fi
elif [[ "$tier" == "standard" || "$tier" == "full" ]]; then
  bad "coherence: declared tier '$tier' arms seam coherence but the manifest has no Seam verification table"
else
  note "seam coherence: dormant (no Seam verification table)"
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
  if grep -q '^Status: superseded' "$f"; then
    bf="$(basename "$f")"
    if grep -vE '^\| [^|]+\.md' "$ARCH" | grep -qF "$bf" \
       || { [[ -f "$MANIFEST" ]] && grep -vE '^\| [^|]+\.md' "$MANIFEST" | grep -qF "$bf"; }; then
      bad "ADR: superseded but referenced as current by the index or manifest — $f"
    fi
  fi
done
[[ $fail -eq 0 ]] && note "ADR: statuses parse"

# Work-doc expiry (check 5): default policy — work docs do not live in the repo.
if grep -rEq '^Expires:' "${COVERED[@]}" 2>/dev/null; then
  bad "work-doc policy: a covered doc carries 'Expires:' — work docs live in the issue tracker"
fi
note "work docs: none in the repo"

# Seam-table completeness (check 6): every coverage doc is a seam doc, in the
# labeled non-seam section, or in the labeled superseded-decisions section;
# every seam code root exists on disk. When the harness-owned coverage manifest
# is present it is the coverage home: the compact index stays a seam index and
# the non-seam and superseded tables are not required to re-list every doc.
mapfile -t NONSEAM < <(awk '/^## Non-seam docs/{f=1; next} /^## /{f=0} f && /^- / {sub(/^- /,""); gsub(/[[:space:]]/,""); print}' "$ARCH")
mapfile -t SUPERSEDED < <(awk '/^## Superseded decisions/{f=1; next} /^## /{f=0} f && /^\| [^|]+\.md/' "$ARCH" | grep -oE '^\| [^|]+\.md' | sed -E 's/^\| //; s/[[:space:]]*$//' | sort -u)
seam_docs=()
for s in "${SEAMS[@]}"; do seam_docs+=("${s##*|}"); done
table_fail=0
if [[ -f "$MANIFEST" ]]; then
  for s in "${SEAMS[@]}"; do
    name="${s%%|*}"; rest="${s#*|}"; root="${rest%%|*}"
    [[ -d "$root" ]] || { bad "seam-table: code root '$root' does not exist on disk"; table_fail=1; }
  done
else
  for f in "${COVERED[@]}"; do
    if ! grep -qxF "$f" <(printf '%s\n' "${seam_docs[@]}") && ! grep -qxF "$f" <(printf '%s\n' "${NONSEAM[@]}") && ! grep -qxF "$f" <(printf '%s\n' "${SUPERSEDED[@]}"); then
      bad "seam-table: coverage doc '$f' is in neither the seam table nor the non-seam list"; table_fail=1
    fi
  done
  for s in "${SEAMS[@]}"; do
    name="${s%%|*}"; rest="${s#*|}"; root="${rest%%|*}"
    [[ -d "$root" ]] || { bad "seam-table: code root '$root' does not exist on disk"; table_fail=1; }
  done
  for f in "${SUPERSEDED[@]}"; do
    grep -q '^Status: superseded' "$f" || { bad "superseded: '$f' is listed as superseded but its Status line says otherwise"; table_fail=1; }
  done
fi
[[ $table_fail -eq 0 ]] && note "seam-table: coverage <-> seam/non-seam/superseded tables match"

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

# Policy coverage (check 8): policy docs live anywhere the index declares them,
# including the root review policy, not one fixed subdirectory. Every policy on
# disk is linked from the index; every policy linked from the index exists; a
# policy with declared governing sources changes in the same working-tree diff
# as any modified source.
mapfile -t POLICIES < <({ find docs/policies -name '*.md' -type f 2>/dev/null; [[ -f REVIEW.md ]] && printf '%s\n' REVIEW.md; } | sort)
mapfile -t POLICYROWS < <(awk -F'|' '/^\| [^|]+\.md \| policy \|/ {gsub(/ /,"",$2); print $2}' "$COVERAGE_SRC")
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
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # Freshness runs over discovered policies plus every policy path the index
    # declares, so an adopter-declared location gets the same half.
    declare -A POLICYSET=()
    for f in "${POLICIES[@]}"; do [[ -f $f ]] && POLICYSET["$f"]=1; done
    for f in "${POLICYROWS[@]}"; do [[ -f $f ]] && POLICYSET["$f"]=1; done
    for f in "${!POLICYSET[@]}"; do
      gov="$(grep -m1 '^<!-- Governs-from:' "$f" | sed -E 's/^<!-- Governs-from:[[:space:]]*//; s/[[:space:]]*-->$//')"
      [[ -z "$gov" ]] && continue
      IFS=',' read -ra GOVSRC <<< "$gov"
      for src in "${GOVSRC[@]}"; do
        src="$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' <<<"$src")"
        [[ -n "$src" ]] || continue
        if [[ ! -e "$src" ]]; then
          bad "policy: governing source '$src' declared by '$f' does not exist"; pol_fail=1
        elif [[ -n "$(git status --porcelain -- "$src")" ]] && [[ -z "$(git status --porcelain -- "$f")" ]]; then
          bad "policy: '$f' not updated although governing source '$src' changed"; pol_fail=1
        fi
      done
    done
    unset POLICYSET
  fi
  [[ $pol_fail -eq 0 ]] && note "policy coverage: policies indexed and fresh"
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
inv_fail=0; inv_total=0
declare -A INV_OWNER
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
    INV_OWNER["$id"]="$doc"
    inv_total=$((inv_total+1))
  done
done
if [[ $inv_total -eq 0 ]]; then
  note "invariant integrity: dormant (no invariants yet)"
else
  mapfile -t INVSCAN < <({ find docs -name '*.md' -type f; printf '%s\n' AGENTS.md ARCHITECTURE.md CONTEXT.md README.md; } | sort)
  for f in "${INVSCAN[@]}"; do
    [[ -f "$f" ]] || continue
    while IFS= read -r line; do
      [[ "$line" == *".."* || "$line" == *"(Retired"* ]] && continue
      for id in $(grep -oE 'INV-[0-9]+' <<<"$line" | sort -u); do
        [[ -n "${INV_OWNER[$id]+x}" ]] || { bad "invariant: '$id' referenced in $f but not declared"; inv_fail=1; }
      done
    done < "$f"
  done
  inv_count=$inv_total
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

# Orientation budget (check 11): every route the manifest declares must fit
# its task-band byte cap. Routes resolve deterministically from the compact
# index, whole affected seam leaf docs, leaf-named glossary entries, and
# machine-required decisions or policies; a compact citation (a bare decision
# or policy bullet) stays navigation and never loads source content. The
# manifest itself is never part of a resolved set. Dormant until routes are
# declared: un-migrated leaves fail loudly once declared, never silently.
if [[ -f "$MANIFEST" ]]; then
  mapfile -t ROUTES < <(awk -F'|' '/^\| (ordinary|api-route|schema-data|re-orientation) \|/ {gsub(/ /,"",$2); gsub(/ /,"",$3); print $2 "|" $3}' "$MANIFEST")
  if [[ ${#ROUTES[@]} -eq 0 ]]; then
    note "orientation budget: no declared routes (declared per seam as leaves come within budget)"
  else
    route_ok=0
    for route in "${ROUTES[@]}"; do
      band="${route%%|*}"; seams="${route#*|}"
      case "$band" in
        ordinary) cap=6000 ;;
        api-route) cap=9000 ;;
        schema-data) cap=12000 ;;
        re-orientation) cap=7000 ;;
      esac
      route_err=0
      # Byte accounting is per resolved file, so a source shared by several
      # seams (index, glossary, linked ADR or policy) counts once, matching the
      # resolver's deduplicated Buffer.byteLength semantics. Glossary blocks
      # are partial-file contributions summed under their glossary file; the
      # same block named twice counts once.
      declare -A BYTES=()
      declare -A BLOCKSEEN=()
      BYTES["$ARCH"]=$(wc -c < "$ARCH")
      for seam in $(printf '%s' "$seams" | tr ',' ' '); do
        leaf=$(awk -F'|' -v n="$seam" '$0 ~ /^\|/ {gsub(/ /,"",$2); gsub(/ /,"",$6); if ($2==n && $6 ~ /\.md$/) print $6}' "$ARCH")
        if [[ -z "$leaf" ]]; then
          bad "orientation budget: seam '$seam' has no leaf row in the index"; route_err=1; continue
        fi
        BYTES["$leaf"]=$(wc -c < "$leaf")
        # Every `- Glossary:` declaration in the leaf is processed, parsing
        # file + comma-separated terms per line; the same block (dedupe key
        # block:<file>:<term>, term trimmed/lowercased with trailing spaces
        # and periods stripped) counts once, matching the resolver.
        while IFS= read -r gline; do
          gfile=$(sed -E 's/^- Glossary: `([^`]+)`.*/\1/' <<<"$gline")
          terms=$(sed -E 's/^- Glossary: `[^`]+`[[:space:]]*—[[:space:]]*(.*)$/\1/' <<<"$gline")
          while IFS= read -r term; do
            term=$(printf '%s' "$term" | sed -E 's/^[[:space:]]+//; s/[[:space:].]+$//' | tr '[:upper:]' '[:lower:]')
            [[ -z "$term" ]] && continue
            bkey="block:$gfile:$term"
            [[ -n "${BLOCKSEEN[$bkey]+x}" ]] && continue
            BLOCKSEEN[$bkey]=1
            # C-locale awk makes length() count UTF-8 bytes, matching the
            # resolver's Buffer.byteLength over the joined block text. The
            # resolver joins block lines with \n, so the block's byte count
            # is sum(line lengths) + (line count - 1) newlines; the +1 per
            # line below includes every newline, so the final newline (which
            # the join omits) is subtracted.
            blockbytes=$(LC_ALL=C awk -v k="$term" '
              BEGIN { want="**" k "**:"; got=0; b=0 }
              { line=$0 }
              /^\*\*/ { if (got) exit; if (tolower(line) == want) got=1; if (got) b += length(line) + 1; next }
              got { b += length(line) + 1 }
              END { print (got ? b - 1 : 0) }
            ' "$gfile")
            BYTES["$gfile"]=$(( ${BYTES[$gfile]:-0} + blockbytes ))
          done < <(printf '%s\n' "$terms" | tr ',' '\n')
        done < <(grep -E '^- Glossary: ' "$leaf" || true)
        if [[ "$band" != "re-orientation" ]]; then
          while IFS= read -r dline; do
            dfile=$(sed -E 's/^- Decision: `([^`]+\.md)`.*/\1/' <<<"$dline")
            [[ "$dfile" =~ \.md$ ]] || continue
            # Only the exact `— requires.` clause (line end, trailing
            # whitespace tolerated) loads; free text after the period or a
            # bare decision bullet is a compact citation that stays
            # navigation. A filename containing "requires" is irrelevant.
            grep -qE -- '—[[:space:]]*requires\.[[:space:]]*$' <<<"$dline" || continue
            # Exact-token, fail-closed boundary (must agree with
            # orientation.ts): the Status line value is exactly
            # accepted | superseded | rejected — no prefix junk and no
            # trailing text after the token ("Status: accepted-ish" or
            # "Status: accepted extra" never match).
            st=$(sed -nE 's/^Status:[[:space:]]*(accepted|superseded|rejected)[[:space:]]*$/\1/p' "$dfile" | head -n1)
            # Only a parseable accepted or superseded status joins; missing,
            # draft, malformed, and rejected statuses never load.
            [[ "$st" == "accepted" || "$st" == "superseded" ]] || continue
            BYTES["$dfile"]=$(wc -c < "$dfile")
          done < <(grep -E '^- Decision: ' "$leaf" || true)
        fi
        if [[ "$band" == "api-route" || "$band" == "schema-data" ]]; then
          while IFS= read -r pline; do
            pfile=$(sed -E 's/^- Policy: `([^`]+\.md)`.*/\1/' <<<"$pline")
            [[ "$pfile" =~ \.md$ ]] || continue
            # Same split: only the exact `— requires.` clause loads; a bare
            # policy bullet and a `- Review policy:` bullet (ordinary
            # navigation, not a machine form) stay compact citations.
            grep -qE -- '—[[:space:]]*requires\.[[:space:]]*$' <<<"$pline" || continue
            BYTES["$pfile"]=$(wc -c < "$pfile")
          done < <(grep -E '^- Policy: ' "$leaf" || true)
        fi
      done
      mapfile -t SRCDEDUP < <(printf '%s\n' "${!BYTES[@]}" | sort -u)
      bytes=0
      for f in "${!BYTES[@]}"; do bytes=$((bytes + ${BYTES[$f]})); done
      unset BYTES BLOCKSEEN
      for s in "${SRCDEDUP[@]}"; do
        [[ -e "$s" ]] || { bad "orientation budget: resolved source missing — $s"; route_err=1; }
      done
      if printf '%s\n' "${SRCDEDUP[@]}" | grep -qxF "$MANIFEST"; then
        bad "orientation budget: the coverage manifest leaked into a resolved set"
        route_err=1
      fi
      if (( route_err == 0 )); then
        if (( bytes > cap )); then
          bad "orientation budget: route ($band [$seams]) over budget — task band $band, resolved bytes $bytes, cap $cap, source count ${#SRCDEDUP[@]}"
          for s in "${SRCDEDUP[@]}"; do printf '       source: %s\n' "$s"; done
        else
          route_ok=$((route_ok+1))
        fi
      fi
    done
    [[ $route_ok -eq ${#ROUTES[@]} ]] && note "orientation budget: ${#ROUTES[@]} declared route(s) within caps"
  fi
else
  note "orientation budget: dormant (no coverage manifest)"
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
printf 'scorecard: docs %d/%d (%d%%), seams %d, tier %s, coherence %d/%d, invariants:%s, ADRs accepted %d / superseded %d / rejected %d, debt open %d / resolved %d, human docs %d\n' \
  "$covered" "$ondisk" "$pct" "${#SEAMS[@]}" "${tier:-undeclared}" "$ver_ok" "$ver_total" "$inv_list" "$adr_accepted" "$adr_superseded" "$adr_rejected" "$debt_open" "$debt_resolved" "${#HUMAN[@]}"

exit "$fail"
