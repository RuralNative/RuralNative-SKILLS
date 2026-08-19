#!/usr/bin/env python3
"""
unslopify scanner — advisory AI-tell detector.

Reads explicit text or Markdown inputs, masks protected regions,
and reports measurable signals with AIT-* identifiers.
Uses only Python 3 standard library, performs no network access,
and never writes source files. Thresholds are advisory.

Version: 1.0
Schema version: 1.0
"""

import argparse
import json
import re
import sys
import os
import math

VERSION = "1.0"
SCHEMA_VERSION = "1.0"

# Stock phrasing — maps to AIT-LEX-002 and related LEX families.
STOCK_PHRASES = [
    "delve", "crucial", "vibrant", "tapestry", "pivotal", "testament",
    "showcase", "landscape", "underscore", "intricate", "interplay",
    "garner", "fostering", "enduring", "enhance", "additionally",
    "moreover", "furthermore", "however", "nestled", "breathtaking",
    "groundbreaking", "renowned", "stunning", "must-visit",
    "pivotal moment", "testament to", "evolving landscape",
    "setting the stage for", "indelible mark", "deeply rooted",
    "serves as", "stands as", "boasts", "features",
    "substrate", "vector", "locus", "nexus", "primitive",
    "bedrock", "scaffolding", "modality", "paradigm",
    "gold-plating", "ratchet", "endgame", "north star", "flywheel",
]

CANNED_OPENINGS = [
    "in today's fast-paced world",
    "in todays fast-paced world",
    "in the ever-evolving landscape",
    "in the evolving landscape",
    "setting the stage for",
    "in today's world",
    "in the modern era of",
    "welcome to the future",
    "in conclusion, this section",
    "introduction:",
]

CANNED_ENDINGS = [
    "the future looks bright",
    "in conclusion",
    "in summary",
    "ultimately, the future",
    "as we look to the future",
    "the journey has just begun",
    "sky is the limit",
    "possibilities are endless",
]

THRESHOLDS = {
    "stock_phrases": 2,
    "repeated_openers": 3,
    "repeated_transitions": 3,
    "emdash_count": 3,
    "colon_count": 8,
    "bold_count": 5,
    "sentence_uniformity_cv": 0.25,
    "paragraph_uniformity_cv": 0.30,
    "canned": 1,
}

# Exit codes
EXIT_SUCCESS = 0
EXIT_INVALID_INPUT = 1
EXIT_UNMATCHED_MARKERS = 2
EXIT_PARSE_FAILURE = 3
EXIT_INTERNAL = 4

OFF_MARKER = "<!-- unslopify:off -->"
ON_MARKER = "<!-- unslopify:on -->"


def offset_to_line(content, offset):
    return content.count("\n", 0, offset) + 1


def excerpt_for(content, start, end, max_len=120):
    snippet = content[start:end].strip().replace("\n", " ")
    if len(snippet) > max_len:
        snippet = snippet[: max_len - 3] + "..."
    if not snippet:
        line_start = offset_to_line(content, start)
        lines = content.splitlines()
        if 1 <= line_start <= len(lines):
            snippet = lines[line_start - 1].strip()[:max_len]
    return snippet


def validate_and_mask_off_ranges(content):
    # Find all off/on markers
    off_pat = re.compile(r"<!--\s*unslopify:off\s*-->")
    on_pat = re.compile(r"<!--\s*unslopify:on\s*-->")
    offs = [(m.start(), m.end(), "off") for m in off_pat.finditer(content)]
    ons = [(m.start(), m.end(), "on") for m in on_pat.finditer(content)]
    combined = sorted(offs + ons, key=lambda x: x[0])
    if not combined:
        return content, None

    # Validate order and nesting
    masked = list(content)
    in_off = False
    off_start = -1
    ranges = []
    for start, end, kind in combined:
        if kind == "off":
            if in_off:
                # nested off before on
                line = offset_to_line(content, start)
                return None, (f"nested {OFF_MARKER} at line {line} without closing {ON_MARKER}", line)
            in_off = True
            off_start = start
        else:  # on
            if not in_off:
                line = offset_to_line(content, start)
                return None, (f"unmatched {ON_MARKER} at line {line} without preceding {OFF_MARKER}", line)
            # close range
            ranges.append((off_start, end))
            in_off = False
    if in_off:
        line = offset_to_line(content, off_start)
        return None, (f"unmatched {OFF_MARKER} at line {line} without closing {ON_MARKER}", line)

    # Mask ranges
    for s, e in ranges:
        for i in range(s, e):
            if masked[i] != "\n":
                masked[i] = " "
    return "".join(masked), None


def mask_frontmatter(content):
    if content.startswith("---\n") or content.startswith("---\r\n"):
        # Find closing ---
        # frontmatter is from start to next line that is exactly --- (allow trailing spaces)
        lines = content.splitlines(True)
        # lines[0] is "---\n"
        end_idx = -1
        pos = len(lines[0])
        for idx in range(1, len(lines)):
            stripped = lines[idx].strip()
            if stripped == "---":
                end_idx = idx
                break
            pos += len(lines[idx])
        if end_idx != -1:
            # mask from 0 to pos + len(lines[end_idx])
            end_pos = sum(len(l) for l in lines[: end_idx + 1])
            chars = list(content)
            for i in range(0, end_pos):
                if chars[i] != "\n":
                    chars[i] = " "
            return "".join(chars)
    return content


def mask_fenced_code(content):
    chars = list(content)
    lines = content.splitlines(True)
    # Need offset tracking
    offset = 0
    in_fence = False
    fence_char = None
    fence_len = 0
    for line in lines:
        stripped = line.lstrip()
        is_fence = False
        marker = None
        if stripped.startswith("```"):
            marker = "`"
            is_fence = True
        elif stripped.startswith("~~~"):
            marker = "~"
            is_fence = True
        if is_fence:
            count = len(stripped) - len(stripped.lstrip("`~"))
            # Determine fence length
            if not in_fence:
                in_fence = True
                fence_char = marker
                fence_len = count
                # mask this line
                for i in range(offset, offset + len(line)):
                    if chars[i] != "\n":
                        chars[i] = " "
            else:
                # closing fence if same char and at least fence_len
                if marker == fence_char and count >= fence_len:
                    for i in range(offset, offset + len(line)):
                        if chars[i] != "\n":
                            chars[i] = " "
                    in_fence = False
                    fence_char = None
                    fence_len = 0
                else:
                    # inside fence, mask
                    for i in range(offset, offset + len(line)):
                        if chars[i] != "\n":
                            chars[i] = " "
        else:
            if in_fence:
                for i in range(offset, offset + len(line)):
                    if chars[i] != "\n":
                        chars[i] = " "
        offset += len(line)
    return "".join(chars)


def mask_html_comments(content):
    # Already handled off/on ranges, now mask remaining <!-- ... -->
    chars = list(content)
    for m in re.finditer(r"<!--.*?-->", content, flags=re.DOTALL):
        s, e = m.start(), m.end()
        # If already masked (spaces), skip? Check if chars already spaces
        for i in range(s, e):
            if chars[i] != "\n":
                chars[i] = " "
    return "".join(chars)


def mask_inline_code(content):
    chars = list(content)
    # Match `code` with 1-3 backticks; keep simple
    for m in re.finditer(r"(`+)[^\n]*?\1", content):
        s, e = m.start(), m.end()
        for i in range(s, e):
            if chars[i] != "\n":
                chars[i] = " "
    return "".join(chars)


def mask_link_destinations(content):
    chars = list(content)
    for m in re.finditer(r"\[([^\]]*)\]\(([^)]*)\)", content):
        # group 2 is URL
        s, e = m.start(2), m.end(2)
        for i in range(s, e):
            if chars[i] != "\n":
                chars[i] = " "
    return "".join(chars)


def is_non_english_paragraph(text):
    # Check for non-ASCII ratio and CJK presence
    stripped = text.strip()
    if len(stripped) < 20:
        return False
    # Count non-ASCII
    non_ascii = sum(1 for c in stripped if ord(c) > 127)
    # CJK ranges
    cjk_count = 0
    for c in stripped:
        o = ord(c)
        if (0x4E00 <= o <= 0x9FFF) or (0x3400 <= o <= 0x4DBF) or (0x3040 <= o <= 0x30FF) or (0xAC00 <= o <= 0xD7AF):
            cjk_count += 1
        elif 0x0400 <= o <= 0x04FF:  # Cyrillic
            cjk_count += 1
        elif 0x00C0 <= o <= 0x024F and c.isalpha():
            # Accented Latin — not necessarily non-English but count small
            pass
    if cjk_count >= 3:
        return True
    ratio = non_ascii / max(1, len(stripped))
    if ratio > 0.3 and non_ascii >= 5:
        return True
    # Also detect obvious non-English language markers: French, German etc with high non-ascii
    # Simple heuristic: if >20% non-ascii and length >30, treat as non-English
    if ratio > 0.2 and len(stripped) > 30 and non_ascii >= 6:
        return True
    return False


def mask_non_english(content):
    chars = list(content)
    # Split into paragraphs by blank lines; track offsets
    # Use regex to find paragraphs (blocks of non-empty lines)
    # Iterate lines with offsets
    lines = content.splitlines(True)
    offset = 0
    para_start = None
    para_end = None
    para_text_parts = []
    paras = []  # list of (start, end, text)
    for line in lines:
        if line.strip() == "":
            if para_start is not None:
                # end paragraph
                paras.append((para_start, para_end, "".join(para_text_parts)))
                para_start = None
                para_end = None
                para_text_parts = []
        else:
            if para_start is None:
                para_start = offset
            para_text_parts.append(line)
            para_end = offset + len(line)
        offset += len(line)
    if para_start is not None:
        paras.append((para_start, para_end, "".join(para_text_parts)))

    for s, e, text in paras:
        # Extract visible text after previous masks: we need to check the current chars slice
        # But we already have masked content in chars; use text from original chars masked so far
        # Check if this paragraph is non-English based on original visible chars (without mask)
        visible_slice = "".join(chars[s:e])
        # If already heavily masked (spaces), skip
        if visible_slice.strip() == "":
            continue
        if is_non_english_paragraph(visible_slice):
            for i in range(s, e):
                if chars[i] != "\n":
                    chars[i] = " "
    return "".join(chars)


def apply_all_masks(original):
    # Returns (masked, error) where error is (msg, line) if unmatched markers
    masked, err = validate_and_mask_off_ranges(original)
    if err is not None:
        return None, err
    masked = mask_frontmatter(masked)
    masked = mask_fenced_code(masked)
    masked = mask_html_comments(masked)
    masked = mask_inline_code(masked)
    masked = mask_link_destinations(masked)
    masked = mask_non_english(masked)
    return masked, None


def detect_stock_phrases(masked, original, path):
    findings = []
    lower = masked.lower()
    total = 0
    hits = []
    for phrase in STOCK_PHRASES:
        # word boundary search
        pat = r"\b" + re.escape(phrase.lower()) + r"\b"
        matches = list(re.finditer(pat, lower))
        if matches:
            total += len(matches)
            hits.append((phrase, len(matches), matches[0].start()))
    if total >= THRESHOLDS["stock_phrases"]:
        # Find first occurrence for excerpt
        first_start = min(hits, key=lambda x: x[2])[2] if hits else 0
        line_start = offset_to_line(original, first_start)
        line_end = line_start
        excerpt = excerpt_for(original, first_start, first_start + 80)
        evidence = f"found {total} stock phrases (threshold {THRESHOLDS['stock_phrases']}): " + ", ".join(f"'{p}' x{c}" for p, c, _ in hits[:3])
        findings.append({
            "id": "AIT-LEX-002",
            "family": "LEX",
            "path": path,
            "line_start": line_start,
            "line_end": line_end,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": total,
            "threshold": THRESHOLDS["stock_phrases"],
            "confidence": "medium",
        })
    return findings


def detect_repeated_openers(masked, original, path):
    findings = []
    # Split into sentences
    sentence_iter = list(re.finditer(r"[^.!?]+[.!?]+", masked))
    if len(sentence_iter) < 3:
        return findings
    opener_data = []
    for m in sentence_iter:
        text = m.group(0).strip()
        if not text:
            continue
        # Remove leading list markers, quotes
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(>\"']+", "", text)
        words = re.findall(r"[A-Za-z']+", cleaned)
        opener = words[0].lower() if words else ""
        opener_data.append((opener, m.start(), m.end(), text))
    # Sliding window of 3
    for i in range(len(opener_data) - 2):
        o1, s1, e1, t1 = opener_data[i]
        o2, s2, e2, t2 = opener_data[i + 1]
        o3, s3, e3, t3 = opener_data[i + 2]
        if o1 and o1 == o2 == o3:
            line_start = offset_to_line(original, s1)
            line_end = offset_to_line(original, e3)
            excerpt = excerpt_for(original, s1, e3)
            evidence = f"three consecutive sentences start with '{o1}'"
            findings.append({
                "id": "AIT-STR-009",
                "family": "STR",
                "path": path,
                "line_start": line_start,
                "line_end": line_end,
                "excerpt": excerpt,
                "evidence": evidence,
                "measured_value": 3,
                "threshold": THRESHOLDS["repeated_openers"],
                "confidence": "high",
            })
            break  # one finding per document for this signal
    return findings


def detect_repeated_transitions(masked, original, path):
    findings = []
    # Split into paragraphs
    raw_paras = [p for p in re.split(r"\n\s*\n", masked) if p.strip()]
    if len(raw_paras) < 3:
        return findings
    starters = []
    offset = 0
    # Need to track offset per paragraph in masked
    # Use finditer for paragraphs
    for m in re.finditer(r"[^\n][^\n]*(?:\n(?!\n)[^\n]*)*", masked):
        para = m.group(0).strip()
        if not para:
            continue
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(>\"']+", "", para)
        words = re.findall(r"[A-Za-z']+", cleaned)
        first = words[0].lower() if words else ""
        starters.append((first, m.start(), m.end(), para))
    if len(starters) < 3:
        return findings
    # Check if same starter repeats 3 times
    for i in range(len(starters) - 2):
        f1, s1, e1, _ = starters[i]
        f2, s2, e2, _ = starters[i + 1]
        f3, s3, e3, _ = starters[i + 2]
        if f1 and f1 == f2 == f3:
            line_start = offset_to_line(original, s1)
            line_end = offset_to_line(original, e3)
            excerpt = excerpt_for(original, s1, e3)
            evidence = f"three consecutive paragraphs start with transition '{f1}'"
            findings.append({
                "id": "AIT-STR-010",
                "family": "STR",
                "path": path,
                "line_start": line_start,
                "line_end": line_end,
                "excerpt": excerpt,
                "evidence": evidence,
                "measured_value": 3,
                "threshold": THRESHOLDS["repeated_transitions"],
                "confidence": "high",
            })
            break
    return findings


def detect_punctuation_density(masked, original, path):
    findings = []
    total_visible = len(re.sub(r"\s", "", masked))
    if total_visible == 0:
        return findings
    em_count = masked.count("\u2014") + masked.count("\u2013")  # em and en dash
    colon_count = masked.count(":")
    # Em dash density
    if em_count >= THRESHOLDS["emdash_count"]:
        # Find first em dash location
        idx = -1
        for c in ["\u2014", "\u2013"]:
            pos = masked.find(c)
            if pos != -1:
                idx = pos if idx == -1 else min(idx, pos)
        if idx == -1:
            idx = 0
        line_start = offset_to_line(original, idx)
        excerpt = excerpt_for(original, idx, idx + 80)
        evidence = f"em dash count {em_count} exceeds threshold {THRESHOLDS['emdash_count']}"
        findings.append({
            "id": "AIT-FMT-001",
            "family": "FMT",
            "path": path,
            "line_start": line_start,
            "line_end": line_start,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": em_count,
            "threshold": THRESHOLDS["emdash_count"],
            "confidence": "medium",
        })
    if colon_count >= THRESHOLDS["colon_count"]:
        idx = masked.find(":")
        line_start = offset_to_line(original, idx if idx != -1 else 0)
        excerpt = excerpt_for(original, idx if idx != -1 else 0, (idx if idx != -1 else 0) + 80)
        evidence = f"colon count {colon_count} exceeds threshold {THRESHOLDS['colon_count']}"
        findings.append({
            "id": "AIT-FMT-002",
            "family": "FMT",
            "path": path,
            "line_start": line_start,
            "line_end": line_start,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": colon_count,
            "threshold": THRESHOLDS["colon_count"],
            "confidence": "low",
        })
    return findings


def detect_bold_density(masked, original, path):
    findings = []
    # Count bold spans **...**
    bolds = re.findall(r"\*\*[^*\n]+\*\*", masked)
    count = len(bolds)
    if count >= THRESHOLDS["bold_count"]:
        idx = masked.find("**")
        line_start = offset_to_line(original, idx if idx != -1 else 0)
        excerpt = excerpt_for(original, idx if idx != -1 else 0, (idx if idx != -1 else 0) + 80)
        evidence = f"bold span count {count} exceeds threshold {THRESHOLDS['bold_count']}"
        findings.append({
            "id": "AIT-FMT-003",
            "family": "FMT",
            "path": path,
            "line_start": line_start,
            "line_end": line_start,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": count,
            "threshold": THRESHOLDS["bold_count"],
            "confidence": "medium",
        })
    # Also check inline-header lists pattern **Label:** 
    inline_headers = re.findall(r"\*\*[^*\n]+:\*\*", masked)
    if inline_headers and len(inline_headers) > 2:
        idx = masked.find(inline_headers[0])
        line_start = offset_to_line(original, idx)
        excerpt = excerpt_for(original, idx, idx + 80)
        evidence = f"inline-header label count {len(inline_headers)} suggests bold-label overuse"
        findings.append({
            "id": "AIT-FMT-004",
            "family": "FMT",
            "path": path,
            "line_start": line_start,
            "line_end": line_start,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": len(inline_headers),
            "threshold": 2,
            "confidence": "medium",
        })
    return findings


def detect_sentence_uniformity(masked, original, path):
    findings = []
    sentences = [m.group(0).strip() for m in re.finditer(r"[^.!?]+[.!?]+", masked) if m.group(0).strip()]
    if len(sentences) < 5:
        return findings
    lengths = []
    for s in sentences:
        words = re.findall(r"\b\w+\b", s)
        lengths.append(len(words))
    if not lengths:
        return findings
    mean_len = sum(lengths) / len(lengths)
    if mean_len == 0:
        return findings
    # stddev
    var = sum((x - mean_len) ** 2 for x in lengths) / len(lengths)
    stdev = math.sqrt(var)
    cv = stdev / mean_len if mean_len else 1
    if cv < THRESHOLDS["sentence_uniformity_cv"]:
        # Use whole doc span
        line_start = 1
        line_end = original.count("\n") + 1
        excerpt = excerpt_for(original, 0, 120)
        evidence = f"sentence length CV {cv:.3f} below threshold {THRESHOLDS['sentence_uniformity_cv']}: mean {mean_len:.1f} words, stdev {stdev:.1f}"
        findings.append({
            "id": "AIT-STR-011",
            "family": "STR",
            "path": path,
            "line_start": line_start,
            "line_end": line_end,
            "excerpt": excerpt,
            "evidence": evidence,
            "measured_value": round(cv, 3),
            "threshold": THRESHOLDS["sentence_uniformity_cv"],
            "confidence": "low",
        })
    return findings


def detect_paragraph_uniformity(masked, original, path):
    findings = []
    paras = [p.strip() for p in re.split(r"\n\s*\n", masked) if p.strip()]
    if len(paras) < 3:
        return findings
    lengths = []
    for p in paras:
        visible = re.sub(r"\s+", " ", p).strip()
        if not visible:
            continue
        # Skip if para is mostly masked spaces? Check original
        words = re.findall(r"\b\w+\b", visible)
        lengths.append(len(words))
    if len(lengths) < 3:
        return findings
    mean_len = sum(lengths) / len(lengths)
    if mean_len == 0:
        return findings
    var = sum((x - mean_len) ** 2 for x in lengths) / len(lengths)
    stdev = math.sqrt(var)
    cv = stdev / mean_len if mean_len else 1
    if cv < THRESHOLDS["paragraph_uniformity_cv"]:
        line_start = 1
        line_end = original.count("\n") + 1
        excerpt = excerpt_for(original, 0, 120)
        evidence = f"paragraph length CV {cv:.3f} below threshold {THRESHOLDS['paragraph_uniformity_cv']}: mean {mean_len:.1f} words"
        findings.append({
            "id": "AIT-STR-011",
            "family": "STR",
            "path": path,
            "line_start": line_start,
            "line_end": line_end,
            "excerpt": excerpt,
            "evidence": evidence + " (paragraph)",
            "measured_value": round(cv, 3),
            "threshold": THRESHOLDS["paragraph_uniformity_cv"],
            "confidence": "low",
        })
    return findings


def detect_canned_openings_endings(masked, original, path):
    findings = []
    lower_masked = masked.lower()
    # Opening: check first 500 chars
    first_chunk = lower_masked[:800]
    for phrase in CANNED_OPENINGS:
        if phrase in first_chunk:
            idx = lower_masked.find(phrase)
            line_start = offset_to_line(original, idx)
            line_end = offset_to_line(original, idx + len(phrase))
            excerpt = excerpt_for(original, idx, idx + len(phrase) + 40)
            evidence = f"canned opening phrase '{phrase}' found in first 800 chars"
            findings.append({
                "id": "AIT-STR-014",
                "family": "STR",
                "path": path,
                "line_start": line_start,
                "line_end": line_end,
                "excerpt": excerpt,
                "evidence": evidence,
                "measured_value": 1,
                "threshold": THRESHOLDS["canned"],
                "confidence": "medium",
            })
            break
    # Ending: check last 800 chars
    last_chunk = lower_masked[-800:] if len(lower_masked) > 800 else lower_masked
    offset_base = len(masked) - len(last_chunk)
    for phrase in CANNED_ENDINGS:
        if phrase in last_chunk:
            idx = lower_masked.rfind(phrase)
            line_start = offset_to_line(original, idx)
            line_end = offset_to_line(original, idx + len(phrase))
            excerpt = excerpt_for(original, idx, idx + len(phrase) + 40)
            evidence = f"canned ending phrase '{phrase}' found in last 800 chars"
            findings.append({
                "id": "AIT-EVD-005",
                "family": "EVD",
                "path": path,
                "line_start": line_start,
                "line_end": line_end,
                "excerpt": excerpt,
                "evidence": evidence,
                "measured_value": 1,
                "threshold": THRESHOLDS["canned"],
                "confidence": "medium",
            })
            break
    return findings


def scan_content(original, path):
    masked, err = apply_all_masks(original)
    if err is not None:
        msg, line = err
        return None, (msg, line)
    findings = []
    findings.extend(detect_stock_phrases(masked, original, path))
    findings.extend(detect_repeated_openers(masked, original, path))
    findings.extend(detect_repeated_transitions(masked, original, path))
    findings.extend(detect_punctuation_density(masked, original, path))
    findings.extend(detect_bold_density(masked, original, path))
    findings.extend(detect_sentence_uniformity(masked, original, path))
    findings.extend(detect_paragraph_uniformity(masked, original, path))
    findings.extend(detect_canned_openings_endings(masked, original, path))
    return findings, None


def main():
    parser = argparse.ArgumentParser(
        prog="scanner.py",
        description="unslopify advisory scanner — measurable AI-tell signals (advisory, never blocks gate)",
        add_help=True,
    )
    parser.add_argument("files", nargs="*", help="Markdown or text files to scan; if none, reads stdin")
    parser.add_argument("--json", action="store_true", help="emit stable versioned JSON")
    parser.add_argument("--format", choices=["text", "json"], help="output format (default text, json for stable schema)")
    parser.add_argument("--text", action="store_true", help="emit human-readable text (default)")
    parser.add_argument("--version", action="store_true", help="print scanner version")
    parser.add_argument("--stdin-path", default="<stdin>", help="path label when reading stdin")
    args = parser.parse_args()

    if args.version:
        print(f"unslopify scanner {VERSION} (schema {SCHEMA_VERSION})")
        sys.exit(EXIT_SUCCESS)

    use_json = args.json or (args.format == "json")

    inputs = []
    file_contents = []  # list of (path, content)

    if not args.files:
        # Read stdin
        try:
            data = sys.stdin.read()
        except Exception as e:
            msg = f"parse failure reading stdin: {e}"
            if use_json:
                # no partial JSON
                print(msg, file=sys.stderr)
                sys.exit(EXIT_PARSE_FAILURE)
            else:
                print(msg, file=sys.stderr)
                sys.exit(EXIT_PARSE_FAILURE)
        if not data.strip():
            msg = "invalid input: no input provided"
            if use_json:
                print(msg, file=sys.stderr)
                sys.exit(EXIT_INVALID_INPUT)
            else:
                print(msg, file=sys.stderr)
                sys.exit(EXIT_INVALID_INPUT)
        file_contents.append((args.stdin_path, data))
        inputs.append(args.stdin_path)
    else:
        for p in args.files:
            inputs.append(p)
            if not os.path.isfile(p):
                msg = f"invalid input: file not found — {p}"
                if use_json:
                    print(msg, file=sys.stderr)
                    sys.exit(EXIT_INVALID_INPUT)
                else:
                    print(msg, file=sys.stderr)
                    sys.exit(EXIT_INVALID_INPUT)
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = f.read()
            except Exception as e:
                msg = f"parse failure reading {p}: {e}"
                if use_json:
                    print(msg, file=sys.stderr)
                    sys.exit(EXIT_PARSE_FAILURE)
                else:
                    print(msg, file=sys.stderr)
                    sys.exit(EXIT_PARSE_FAILURE)
            file_contents.append((p, data))

    all_findings = []
    error_to_report = None
    error_code = EXIT_SUCCESS

    for path, content in file_contents:
        try:
            findings, err = scan_content(content, path)
        except Exception as e:
            msg = f"internal failure scanning {path}: {e}"
            if use_json:
                print(msg, file=sys.stderr)
                sys.exit(EXIT_INTERNAL)
            else:
                print(msg, file=sys.stderr)
                sys.exit(EXIT_INTERNAL)
        if err is not None:
            msg, line = err
            full_msg = f"{path}:{line}: {msg}"
            if msg.startswith("unmatched") or msg.startswith("nested"):
                error_code = EXIT_UNMATCHED_MARKERS
            else:
                error_code = EXIT_PARSE_FAILURE
            error_to_report = full_msg
            break
        all_findings.extend(findings)

    if error_to_report is not None:
        # distinct nonzero and no partial JSON
        if use_json:
            print(error_to_report, file=sys.stderr)
            sys.exit(error_code)
        else:
            print(error_to_report, file=sys.stderr)
            sys.exit(error_code)

    if use_json:
        output = {
            "version": SCHEMA_VERSION,
            "schema_version": SCHEMA_VERSION,
            "findings": all_findings,
            "summary": {
                "files_scanned": len(file_contents),
                "findings_count": len(all_findings),
                "advisory": True,
            },
        }
        # Ensure required fields present and validate
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
        sys.exit(EXIT_SUCCESS)
    else:
        # Human-readable
        if not all_findings:
            # Still success, maybe print summary
            print(f"scanned {len(file_contents)} file(s): no advisory findings")
        else:
            for f in all_findings:
                print(
                    f"{f['path']}:{f['line_start']}-{f['line_end']} [{f['id']}] {f['family']} — "
                    f"{f['evidence']} — excerpt: \"{f['excerpt']}\" "
                    f"(measured {f['measured_value']}, threshold {f['threshold']}, confidence {f['confidence']})"
                )
            print(f"\nscanned {len(file_contents)} file(s): {len(all_findings)} advisory finding(s) (thresholds advisory, not a gate failure)")
        sys.exit(EXIT_SUCCESS)


if __name__ == "__main__":
    main()
