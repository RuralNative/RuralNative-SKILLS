# Parity catalog — upstream 1..31 to local AIT-* identifiers

Source: https://github.com/cursor/plugins/tree/main/pstack/skills/unslop
Pinned commit: 99559f2f52047978602ef365589275831e76af07

Each upstream rule maps to one stable local identifier. No upstream number is
missing or duplicated. Local identifiers are stable and versioned.

| Upstream | Pattern | Local identifier | Family | Notes |
|---|---|---|---|---|
| 1 | Puffery | AIT-EVD-001 | EVD | Puffery and empty importance claims |
| 2 | Name-dropping | AIT-EVD-002 | EVD | Outlet listing without substance |
| 3 | Superficial -ing phrases | AIT-STR-001 | STR | Participial filler |
| 4 | Promotional language | AIT-LEX-001 | LEX | Marketing adjectives |
| 5 | Vague attributions | AIT-EVD-003 | EVD | Unnamed sources |
| 6 | Formulaic challenges | AIT-STR-002 | STR | Stock contrast framing |
| 7 | AI vocabulary | AIT-LEX-002 | LEX | Stock AI word list |
| 8 | Fancy ways to say "is" | AIT-LEX-003 | LEX | Ornamental copulas |
| 9 | "Not just X, but Y." | AIT-STR-003 | STR | False contrast |
| 10 | Rule of three | AIT-STR-004 | STR | Forced triples |
| 11 | Synonym cycling | AIT-LEX-004 | LEX | Terminology churn |
| 12 | False ranges | AIT-STR-005 | STR | Empty range framing |
| 13 | Em dash overuse | AIT-FMT-001 | FMT | Punctuation tell |
| 14 | Colon overuse | AIT-FMT-002 | FMT | Colon as crutch |
| 15 | Boldface overuse | AIT-FMT-003 | FMT | Formatting tell |
| 16 | Inline-header lists | AIT-FMT-004 | FMT | Bold label and colon restatement |
| 17 | Title case headings | AIT-FMT-005 | FMT | Heading casing |
| 18 | Decorative emojis | AIT-FMT-006 | FMT | Emoji ornament |
| 19 | Curly quotes | AIT-FMT-007 | FMT | Quote style |
| 20 | Chatbot phrases | AIT-CONV-001 | CONV | Assistant residue |
| 21 | Cutoff disclaimers | AIT-CONV-002 | CONV | Hedged cutoff |
| 22 | Sycophantic tone | AIT-CONV-003 | CONV | Flattery |
| 23 | Filler phrases | AIT-STR-006 | STR | Wordy filler |
| 24 | Excessive hedging | AIT-EVD-004 | EVD | Qualified hedging |
| 25 | Generic conclusions | AIT-EVD-005 | EVD | Canned ending |
| 26 | Abstract metaphor nouns | AIT-LEX-005 | LEX | Metaphor jargon |
| 27 | Say what it does, not how it feels | AIT-VOICE-001 | VOICE | Feeling vs mechanism |
| 28 | Shorten or split dense sentences | AIT-STR-007 | STR | Sentence density |
| 29 | Active voice | AIT-STR-008 | STR | Passive constructions |
| 30 | Cut adverbs, or use a stronger verb | AIT-LEX-006 | LEX | Weak verb with adverb |
| 31 | Prefer the plain word | AIT-LEX-007 | LEX | Formal synonyms |

## Validation

- Upstream numbers present: 1 through 31 once each, no gaps, no duplicates.
- Local identifiers: all `AIT-*` identifiers above are stable and unique.
- Provenance: see `../NOTICE.md` for upstream copyright and MIT permission.

## Usage

A finding cites its upstream number and local identifier, for example:
"Upstream 7 (AIT-LEX-002) — AI vocabulary: 'delve' in 'delve into the details'".
