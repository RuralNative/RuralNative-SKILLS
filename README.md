# RuralNative-SKILLS

A public collection of skills for AI coding agents. A "skill" is a folder of
instructions an AI agent (like Claude Code or Kilo) can load to get better at
a specific job.

Right now the collection has one skill: **doc-architecture**. It helps keep a
project's documentation honest, so an AI agent working on your code doesn't
get lost or misled.

## Motivation & Purpose

An AI agent starts every conversation from zero. It knows nothing about your
project unless it reads your code or your docs. That leads to two common
problems:

- **No docs at all.** The agent has to re-read your whole codebase every time,
  which is slow and expensive. It keeps rediscovering the same things and
  making the same mistakes.
- **Docs that just describe the code.** Long write-ups of what each file does.
  These go stale fast — the moment someone changes the code, the doc is wrong.
  And a wrong doc is worse than no doc: the agent trusts it, acts on it, and
  breaks things confidently.

This project's idea is simple: treat documentation like a **cache** — a
shortcut that saves work. Docs should only hold the stuff you *can't* figure
out by reading the code: why a decision was made, what words mean, what rules
must never be broken. Everything else, the agent can just read the code.

The goals:

1. Any fact the agent needs should be reachable in **two clicks** from a
   single index page — so getting back up to speed is one quick read, not a
   scavenger hunt.
2. Docs hold **only what code can't tell you** — no restating the code.
3. Docs stay fresh **automatically** — a script checks that docs and code
   still agree, instead of hoping someone remembers to update them.
4. The system **fits the project size** — a small project gets almost no docs;
   bigger projects with more history get more structure, only as needed.

## Philosophy

Six rules guide everything this skill does:

1. **Don't repeat the code.** If reading the code answers the question, the
   docs shouldn't answer it again. Docs are for the "why" — decisions,
   definitions, rules.
2. **Code wins.** If a doc and the code disagree, the code is right. Fix the
   doc in the same change — don't let the mismatch sit there.
3. **Different facts go stale at different speeds.** Word definitions and
   core rules rarely change; step-by-step descriptions go stale almost
   immediately. Each fact goes where it fits, and the fast-stale kinds just
   don't get written down at all.
4. **Two clicks.** Everything is at most two links from the index.
5. **Keep it short.** Index under 150 lines; each doc readable in a couple of
   minutes. Context windows cost money and have limits.
6. **Match the size of the project.** Don't build a library for a sticky note.
   When in doubt, start smaller than you think.

Two more ideas worth knowing: **shortcuts are tracked openly** — known
unfinished things get a number, a status, and a "revisit when" note in one
registry, instead of TODO comments scattered everywhere. And **history is
never rewritten** — when a decision changes, a new short record supersedes the
old one; the old one stays untouched.

## AI-First Workflow Integration

This skill is built for how AI-assisted coding actually works day to day:

- **The agent loads it on its own.** Once installed, the agent picks it up
  whenever documentation work shows up. No manual setup each time.
- **Three modes, matching three situations.**
  - *Establish* — build the doc setup from scratch for a project with no docs.
  - *Audit* — when docs exist but you don't trust them: it labels every file,
    measures what's gone stale, and hands you a to-do list.
  - *Maintain* — the everyday mode: docs get updated in the same commit as the
    code they describe, so they never drift apart.
- **Docs change with the code, not after.** Updating a module? Its doc gets
  touched in the same commit. This is the habit that keeps everything honest.
- **A script does the policing.** A small checker runs nine automatic checks —
  docs listed match docs on disk, changed code means changed docs, every new
  module has a doc, decision records have valid statuses, and so on. Hook it
  into your normal workflow (pre-commit hook or CI) and it runs without anyone
  remembering.
- **Built for memory loss.** AI agents lose context mid-conversation. Because
  everything is two clicks from the index, an agent that "wakes up" confused
  can catch up with one quick read.
- **We use it ourselves.** This very repository follows its own system — index,
  glossary, decision records, and the checker are all right here.

## Comparative Analysis

| | Without this system | With this system |
|---|---|---|
| **Starting speed** | Faster at first — no doc work at all | Small upfront cost to set up the index and checker |
| **Getting back up to speed** | Agent re-reads lots of code, every single time — worse as the project grows | One quick read from the index — stays fast as the project grows |
| **Can you trust the docs?** | They drift out of date silently, then actively mislead | The checker catches drift automatically; wrong docs fail loudly |
| **Why was X decided?** | Buried in chat logs, old commits, or just gone | Short decision records with clear statuses |
| **Word meanings** | Different people (and agents) use different words for the same thing | One glossary; terms have one meaning |
| **Known shortcuts** | Random TODO comments nobody revisits | One registry with status and a "revisit when" note for each |
| **Long-term maintainability** | Doc problems pile up; agents slow down or mess up | Cost stays flat — small updates every change, checked automatically |
| **Multiple agents working** | Each re-learns the project differently | All agents share the same map |

The honest trade-off: you pay a small tax on every change (touch the docs
too, keep the checker green), and in return your docs stay trustworthy —
because they claim less and check themselves.

## Critical Evaluation

**What's good:**

- **Zero dependencies.** No runtime, no framework, no language requirement.
  Works on any project an AI can read.
- **Rules enforced by script, not willpower.** The core promises are checked
  automatically — nobody has to remember to be careful.
- **Grows only when needed.** Checks for things a project doesn't have yet
  (decision records, generated docs) simply stay off.
- **Anti-bloat.** The system actively removes filler docs instead of piling
  them up.
- **Battle-tested origins.** The checks came from a real production docs gate
  and its actual failure modes — not from theory.

**What's not perfect:**

- **Some rules need a human.** A script can't judge everything — like whether
  a "revisit when" note has come due, or whether a doc repeats a policy
  instead of linking to it. Those still need review.
- **The checker must be wired up.** Until it runs in CI, it only fires when
  someone runs it manually.
- **The index tables can cause merge conflicts.** Multiple agents adding new
  modules at once will edit the same tables; no clever fix for that yet.
- **The "two clicks" claim isn't rehearsed.** It's true by design, but there's
  no test yet proving a brand-new agent can actually get oriented that way.
- **Some rules are prose only.** The scorecard marks which rules are enforced
  by code and which are just written down — the written-down ones rely on
  reviewers doing their job.

We're not hiding the flaws — they're the first entries in this repo's own
shortcut registry, each with a note for when to revisit it.

## Future Roadmap

- **Run the checker in CI** — on every pull request, so it never depends on
  memory (revisit when: a second contributor joins).
- **Fix the merge-conflict problem** in the index tables (revisit when: more
  than three modules).
- **A rehearsal test** proving a fresh agent can get oriented from the index
  alone (revisit when: a second agent works on this repo).
- **More skills** — the collection is laid out for many; each new one lands in
  its own folder with its own doc.
- **Worked examples** of auto-generated docs, to exercise that part of the
  checker end to end.
- **Scorecard trends** — showing whether docs are getting staler or cleaner
  over time.

## Getting Started

1. **Install the skill** (recommended):

   ```bash
   npx skills add RuralNative/RuralNative-SKILLS --skill doc-architecture
   ```

2. **No npx? Copy it manually** — clone the repo, then copy the skill folder
   into your agent's skills folder. Keep the folder named
   `doc-architecture`:

   ```bash
   git clone https://github.com/RuralNative/RuralNative-SKILLS.git
   cd RuralNative-SKILLS

   # Anthropic Claude Code (all your projects)
   cp -r skills/doc-architecture ~/.claude/skills/doc-architecture

   # Kilo (this project only)
   cp -r skills/doc-architecture .kilo/skills/doc-architecture

   # Kilo (all your projects)
   cp -r skills/doc-architecture ~/.agents/skills/doc-architecture
   ```

   Other tools: put the folder wherever your agent loads skills from. Full
   details in the skill's `INSTALL.md`.

3. **Check it works** — ask your agent:

   > Run the doc-cache audit on this repo.

   Or, if the project has no docs yet:

   > Establish the doc tree for this repo.

4. **Make it stick** — add the checker to your pre-commit hook or CI so docs
   stay fresh automatically.

## Technical Requirements

- **For the skill: just a codebase** you want an AI agent to work in. No
  dependencies, no runtime, no particular language or framework.
- **For the one-line install:** Node.js (the `npx` command). Not needed if you
  copy manually.
- **For the checker:** a bash shell and Git in the repo being checked — the
  checker reads Git status to verify docs changed with the code. Other version
  control systems need a small adaptation.
- **License:** MIT.

## License

MIT
