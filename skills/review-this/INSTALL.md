# Installing review-this

`review-this` reviews the changes between `HEAD` and a fixed point along two axes, Standards and Spec. Invoke it explicitly as `/review-this <fixed-point>` where `<fixed-point>` is a commit SHA, branch, tag, or merge-base expression such as `main`, `HEAD~5`, or `$(git merge-base origin/main HEAD)`. If the fixed point is missing, the skill asks for one and stops.

## Requirements

- Git history with a non-empty diff against the chosen fixed point.
- `/code-review` installed through its own lane. It is not published by this shelf; install it from its own source before using `review-this`. It carries no `disable-model-invocation` lock and stays model-invocable.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill review-this
```

Manual fallback:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/review-this ~/.agents/skills/review-this
```

## Verification

On a branch whose diff against the fixed point is non-empty, run:

```
/review-this main
```

The skill pins `main`, identifies the spec and standards sources, spawns the Standards and Spec sub-agents in parallel, and reports both axes side by side without merging or reranking findings.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill accepts one invocation only: `/review-this <fixed-point>`. It does not implement tickets, create worktrees, or chain into other workflows; an issue reference may be supplied as the spec source, but no ticket number is required.
