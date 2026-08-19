---
name: release-skills
description: Universal release workflow. Auto-detects version files and changelogs. Supports Node.js, Python, Rust, Claude Plugin, GitHub Releases, annotated tags, historical release backfill, and generic projects. Use when user says "release", "发布", "new version", "bump version", "push", "推送", "release notes", "GitHub Release", or "回填 Release".
---

# Release skills

Use this workflow to inspect a project, choose a version, update its changelogs, and publish the release. It supports Node.js, Python, Rust, Claude Plugin, GitHub Releases, annotated tags, historical release backfill, and generic projects.

## User input tools

When confirmation is needed, use the current runtime's user-input tool in this order:

1. Prefer built-in tools such as `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or an equivalent.
2. If no input tool exists, ask numbered plain-text questions and request one answer for each.
3. If the tool accepts multiple questions, ask all applicable questions in one call. Otherwise, ask them one at a time in priority order.

The `AskUserQuestion` references below are examples. Substitute the equivalent tool in another runtime.

## Quick start

Run `/release-skills`. The workflow reads the project files it finds and reports its detection results before making release changes.

## Supported projects

| Project Type | Version File | Auto-Detected |
|--------------|--------------|---------------|
| Node.js | package.json | ✓ |
| Python | pyproject.toml | ✓ |
| Rust | Cargo.toml | ✓ |
| Claude Plugin | marketplace.json | ✓ |
| Generic | VERSION / version.txt | ✓ |

## Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without executing |
| `--major` | Force major version bump |
| `--minor` | Force minor version bump |
| `--patch` | Force patch version bump |
| `--backfill-releases` | Create missing GitHub Releases for existing tags from changelog sections |

## Workflow

The ten steps below define the release path. The workflow asks for confirmation before it creates the release commit.

### Step 1: Detect project configuration

1. Check for `.releaserc.yml`. It is an optional config override. If it exists, inspect whether it defines release hooks.
2. Auto-detect version file by scanning in priority order:
   - `package.json` (Node.js)
   - `pyproject.toml` (Python)
   - `Cargo.toml` (Rust)
   - `marketplace.json` or `.claude-plugin/marketplace.json` (Claude Plugin)
   - `VERSION` or `version.txt` (Generic)
3. Scan for changelog files with these glob patterns:
   - `CHANGELOG*.md`
   - `HISTORY*.md`
   - `CHANGES*.md`
4. Identify each changelog's language from its filename suffix.
5. Check GitHub release support:
   - Confirm that `origin` points to GitHub.
   - Confirm that `gh` is installed and authenticated.
   - When available, inspect existing releases with `gh release list --limit 5`.
6. Display the detected configuration.

### Project hook contract

If `.releaserc.yml` defines `release.hooks`, keep the workflow generic and hand project-specific packaging and publishing to those hooks.

Supported hooks:

| Hook | Purpose | Expected Responsibility |
|------|---------|-------------------------|
| `prepare_artifact` | Make one target releasable | Validate the target is self-contained, sync/embed local dependencies, optionally stage extra files |
| `publish_artifact` | Publish one releasable target | Upload the prepared target (or a staged directory if the project uses one), attach version/changelog/tags |

Supported placeholders:

| Placeholder | Meaning |
|-------------|---------|
| `{project_root}` | Absolute path to repository root |
| `{target}` | Absolute path to the module/skill being released |
| `{artifact_dir}` | Absolute path to a temporary staging directory for this target, when the project uses one |
| `{version}` | Version selected by the release workflow |
| `{dry_run}` | `true` or `false` |
| `{release_notes_file}` | Absolute path to a UTF-8 file containing release notes/changelog text |

Execution rules:

- Keep the skill generic. Do not hardcode registry, package-manager, or project layout details into this SKILL.
- If `prepare_artifact` exists, run it once per target before publish-related checks that need the final releasable target state.
- Write release notes to a temp file and pass that file path to `publish_artifact`. Do not inline multiline changelog text into shell commands.
- If hooks are absent, use the default project-agnostic release workflow.

### Language detection rules

Changelog files follow `CHANGELOG_{LANG}.md` or `CHANGELOG.{lang}.md`, where `{lang}` or `{LANG}` is a language or region code.

| Pattern | Example | Language |
|---------|---------|----------|
| No suffix | `CHANGELOG.md` | en (default) |
| `_{LANG}` (uppercase) | `CHANGELOG_CN.md`, `CHANGELOG_JP.md` | Corresponding language |
| `.{lang}` (lowercase) | `CHANGELOG.zh.md`, `CHANGELOG.ja.md` | Corresponding language |
| `.{lang-region}` | `CHANGELOG.zh-CN.md` | Corresponding region variant |

Common language codes are `zh` (Chinese), `ja` (Japanese), `ko` (Korean), `de` (German), `fr` (French), and `es` (Spanish).

### Output example

```
Project detected:
  Version file: package.json (1.2.3)
  Changelogs:
    - CHANGELOG.md (en)
    - CHANGELOG.zh.md (zh)
    - CHANGELOG.ja.md (ja)
```

### Step 2: Analyze changes since last tag

```bash
LAST_TAG=$(git tag --sort=-v:refname | head -1)
git log ${LAST_TAG}..HEAD --oneline
git diff ${LAST_TAG}..HEAD --stat
```

Group changes by conventional commit type:

| Type | Description |
|------|-------------|
| feat | New features |
| fix | Bug fixes |
| docs | Documentation |
| refactor | Code refactoring |
| perf | Performance improvements |
| test | Test changes |
| style | Formatting, styling |
| chore | Maintenance (skip in changelog) |

### Breaking change detection

- A commit message that starts with `BREAKING CHANGE` is breaking.
- A commit body or footer containing `BREAKING CHANGE:` is breaking.
- Removed public APIs, renamed exports, and changed interfaces are breaking.

If the workflow finds a breaking change, warn the user: "Breaking changes detected. Consider major version bump (--major flag)."

### Step 3: Determine version bump

Apply these rules in order:

1. A user flag `--major/--minor/--patch` wins.
2. `BREAKING CHANGE` means a major bump (1.x.x → 2.0.0).
3. `feat:` commits mean a minor bump (1.2.x → 1.3.0).
4. Otherwise, use a patch bump (1.2.3 → 1.2.4).

Display the version change as `1.2.3 → 1.3.0`.

### Step 4: Generate multi-language changelogs

For each detected changelog file:

1. Identify the language from the filename suffix.
2. Find third-party contributors:
   - Check merge commits with `git log ${LAST_TAG}..HEAD --merges --pretty=format:"%H %s"`.
   - For each merged PR, get the author with `gh pr view <number> --json author --jq '.author.login'`.
   - Get the repository owner with `gh repo view --json owner --jq '.owner.login'`.
   - A PR author who differs from the repository owner is a third-party contributor.
3. Write content in that language:
   - Write section titles in the target language.
   - Write change descriptions naturally in the target language. Do not translate mechanically.
   - Use YYYY-MM-DD for dates.
   - Append `(by @username)` to entries from third-party contributors.
4. Insert the new section at the file head and keep existing content.

### Section title translations

| Type | en | zh | ja | ko | de | fr | es |
|------|----|----|----|----|----|----|-----|
| feat | Features | 新功能 | 新機能 | 새로운 기능 | Funktionen | Fonctionnalités | Características |
| fix | Fixes | 修复 | 修正 | 수정 | Fehlerbehebungen | Corrections | Correcciones |
| docs | Documentation | 文档 | ドキュメント | 문서 | Dokumentation | Documentation | Documentación |
| refactor | Refactor | 重构 | リファクタリング | 리팩토링 | Refactoring | Refactorisation | Refactorización |
| perf | Performance | 性能优化 | パフォーマンス | 성능 | Leistung | Performance | Rendimiento |
| breaking | Breaking Changes | 破坏性变更 | 破壊的変更 | 주요 변경사항 | Breaking Changes | Changements majeurs | Cambios importantes |

### Changelog format

```markdown
## {VERSION} - {YYYY-MM-DD}

### Features
- Description of new feature
- Description of third-party contribution (by @username)

### Fixes
- Description of fix

### Documentation
- Description of docs changes
```

Include only sections that contain changes. Omit empty sections.

### Third-party attribution rules

- Add `(by @username)` only for contributors who are NOT the repository owner.
- Use the GitHub username with an `@` prefix.
- Put the attribution at the end of the changelog entry line.
- Apply the `(by @username)` format to every language. Do not translate it.

### Multi-language example

English (CHANGELOG.md):

```markdown
## 1.3.0 - 2026-01-22

### Features
- Add user authentication module (by @contributor1)
- Support OAuth2 login

### Fixes
- Fix memory leak in connection pool
```

Chinese (CHANGELOG.zh.md):

```markdown
## 1.3.0 - 2026-01-22

### 新功能
- 新增用户认证模块 (by @contributor1)
- 支持 OAuth2 登录

### 修复
- 修复连接池内存泄漏问题
```

Japanese (CHANGELOG.ja.md):

```markdown
## 1.3.0 - 2026-01-22

### 新機能
- ユーザー認証モジュールを追加 (by @contributor1)
- OAuth2 ログインをサポート

### 修正
- コネクションプールのメモリリークを修正
```

### Step 5: Group changes by skill/module

Analyze commits since the last tag and group their affected files by skill or module:

1. Identify changed files for each commit.
2. Group changed files as follows:
   - `skills/<skill-name>/*` belongs under that skill.
   - Root files such as CLAUDE.md belong under "project".
   - Split a commit that changes multiple skills into multiple groups.
3. For each group, identify related README updates.

### Example grouping

```
baoyu-cover-image:
  - feat: add new style options
  - fix: handle transparent backgrounds
  → README updates: options table

baoyu-comic:
  - refactor: improve panel layout algorithm
  → No README updates needed

project:
  - docs: update CLAUDE.md architecture section
```

### Step 6: Commit each skill/module separately

Process each skill or module group in change order.

1. Check whether README updates are needed:
   - Scan `README*.md` for mentions of the skill or module.
   - Verify that options and flags are documented correctly.
   - Update usage examples if syntax changed.
   - Update feature descriptions if behavior changed.
2. Stage and commit the group:
   ```bash
   git add skills/<skill-name>/*
   git add README.md README.zh.md  # If updated for this skill
   git commit -m "<type>(<skill-name>): <meaningful description>"
   ```
3. Use the conventional commit format `<type>(<scope>): <description>`:
   - `<type>` is feat, fix, refactor, docs, perf, or another commit type.
   - `<scope>` is the skill name or "project".
   - `<description>` explains the change.

### Example commits

```bash
git commit -m "feat(baoyu-cover-image): add watercolor and minimalist styles"
git commit -m "fix(baoyu-comic): improve panel layout for long dialogues"
git commit -m "docs(project): update architecture documentation"
```

### Common README updates needed

| Change Type | README Section to Check |
|-------------|------------------------|
| New options/flags | Options table, usage examples |
| Renamed options | Options table, usage examples |
| New features | Feature description, examples |
| Breaking changes | Migration notes, deprecation warnings |
| Restructured internals | Architecture section (if exposed to users) |

### Step 7: Generate changelog and update version

1. Generate multi-language changelogs as described in Step 4.
2. Update the version file:
   - Read the version file (JSON, TOML, or text).
   - Update the version number.
   - Write it back while preserving formatting.
3. Create the release notes file:
   - Prefer the new version section from `CHANGELOG.md`.
   - If no English/default changelog exists, use the first detected changelog.
   - Extract only the exact `## {VERSION} - {YYYY-MM-DD}` section through the next `##`.
   - Match both plain and tag-prefixed headings when needed, such as `1.2.3` and `v1.2.3`.
   - Keep breaking changes near the top. Add a short highlight first when needed.
   - Write notes to a UTF-8 temp file and reuse it for annotated tag messages, GitHub Releases, and `publish_artifact`.
   - In normal mode, stop instead of creating an empty tag or GitHub Release when notes cannot be found.

### Version paths by file type

| File | Path |
|------|------|
| package.json | `$.version` |
| pyproject.toml | `project.version` |
| Cargo.toml | `package.version` |
| marketplace.json | `$.metadata.version` |
| VERSION / version.txt | Direct content |

### Step 8: User confirmation

Before creating the release commit, ask the user to confirm the following three choices with `AskUserQuestion`.

1. Version bump, as a single select:
   - Show the recommended version from Step 3.
   - Offer the recommended version and the other semver options.
   - Example: `1.2.3 → 1.3.0 (Recommended)`, `1.2.3 → 1.2.4`, `1.2.3 → 2.0.0`.
2. Push to remote, as a single select:
   - Offer "Yes, push after commit" and "No, keep local only".
3. Publish GitHub Release, as a single select:
   - Offer this only when GitHub release support is available.
   - Default to "Yes, publish after tag push" when the user also chose push.
   - If the user keeps the release local, do not create or edit a GitHub Release.

### Example output before confirmation

```
Commits created:
  1. feat(baoyu-cover-image): add watercolor and minimalist styles
  2. fix(baoyu-comic): improve panel layout for long dialogues
  3. docs(project): update architecture documentation

Changelog preview (en):
  ## 1.3.0 - 2026-01-22
  ### Features
  - Add watercolor and minimalist styles to cover-image
  ### Fixes
  - Improve panel layout for long dialogues in comic

Release notes source: CHANGELOG.md#1.3.0
Ready to create release commit, annotated tag, and GitHub Release.
```

### Step 9: Create release commit and annotated tag

After confirmation:

1. Stage the version and changelog files:
   ```bash
   git add <version-file>
   git add CHANGELOG*.md
   ```
2. Create the release commit:
   ```bash
   git commit -m "chore: release v{VERSION}"
   ```
3. Create the annotated tag:
   ```bash
   git tag -a v{VERSION} -F <release-notes-file>
   ```
   If `.releaserc.yml` sets `tag.sign: true`, use `git tag -s` with the same notes file.
4. If the user confirmed the push in Step 8:
   ```bash
   git push origin main
   git push origin v{VERSION}
   ```

Do NOT add Co-Authored-By line. This is a release commit, not a code contribution.

### Step 10: Publish release artifacts and GitHub Release

Project artifact publishing and GitHub Releases are separate outputs.

1. Project artifacts:
   - If `release.hooks.publish_artifact` exists, run it once per prepared target.
   - Pass the same `{release_notes_file}` used for the tag and GitHub Release.
   - In dry-run mode, pass `{dry_run}=true` and report what would be published.
2. GitHub Release:
   - Run it only when the user confirmed remote publishing and GitHub support is available.
   - Confirm that the tag exists on the remote before creating the release.
   - Create or update the release with the extracted notes:
     ```bash
     if gh release view v{VERSION} >/dev/null 2>&1; then
       gh release edit v{VERSION} --title "v{VERSION}" --notes-file <release-notes-file>
     else
       gh release create v{VERSION} --title "v{VERSION}" --notes-file <release-notes-file> --verify-tag
     fi
     ```
   - Never inline multiline release notes into shell commands.

### Post-release output

```
Release v1.3.0 created.

Commits:
  1. feat(baoyu-cover-image): add watercolor and minimalist styles
  2. fix(baoyu-comic): improve panel layout for long dialogues
  3. docs(project): update architecture documentation
  4. chore: release v1.3.0

Tag: v1.3.0
Tag type: annotated
GitHub Release: published  # or "skipped/local only"
Status: Pushed to origin  # or "Local only - run git push when ready"
```

## Backfill existing GitHub Releases

Use this mode when the user requests historical release backfill or passes `--backfill-releases`.

1. Do not bump versions, edit changelogs, or create release commits.
2. List tags in version order and find tags without GitHub Releases:
   ```bash
   git tag --sort=v:refname
   gh release view <tag>
   ```
3. For each tag without a GitHub Release:
   - Normalize changelog lookup by stripping the configured tag prefix, such as `v1.2.3` → `1.2.3`.
   - Extract the matching section from `CHANGELOG.md`; fall back to the first matching changelog file.
   - Skip or ask before publishing when no matching changelog section exists.
   - Create the release with:
     ```bash
     gh release create <tag> --title "<tag>" --notes-file <release-notes-file> --verify-tag
     ```
4. Detect lightweight tags with `git cat-file -t <tag>`. `commit` means lightweight and `tag` means annotated.
5. Do not rewrite public lightweight tags by default. Converting an existing remote tag to an annotated tag needs explicit user confirmation because it rewrites a published reference.

## Configuration (.releaserc.yml)

This optional project-root config overrides the defaults:

```yaml
# .releaserc.yml - Optional configuration

# Version file (auto-detected if not specified)
version:
  file: package.json
  path: $.version  # JSONPath for JSON, dotted path for TOML

# Changelog files (auto-detected if not specified)
changelog:
  files:
    - path: CHANGELOG.md
      lang: en
    - path: CHANGELOG.zh.md
      lang: zh
    - path: CHANGELOG.ja.md
      lang: ja

  # Section mapping (conventional commit type → changelog section)
  # Use null to skip a type in changelog
  sections:
    feat: Features
    fix: Fixes
    docs: Documentation
    refactor: Refactor
    perf: Performance
    test: Tests
    chore: null

# Commit message format
commit:
  message: "chore: release v{version}"

# Tag format
tag:
  prefix: v  # Results in v1.0.0
  sign: false

# Additional files to include in release commit
include:
  - README.md
  - package.json
```

## Dry-run mode

When `--dry-run` is specified:

```
=== DRY RUN MODE ===

Project detected:
  Version file: package.json (1.2.3)
  Changelogs: CHANGELOG.md (en), CHANGELOG.zh.md (zh)

Last tag: v1.2.3
Proposed version: v1.3.0

Changes grouped by skill/module:
  baoyu-cover-image:
    - feat: add watercolor style
    - feat: add minimalist style
    → Commit: feat(baoyu-cover-image): add watercolor and minimalist styles
    → README updates: options table

  baoyu-comic:
    - fix: panel layout for long dialogues
    → Commit: fix(baoyu-comic): improve panel layout for long dialogues
    → No README updates

Changelog preview (en):
  ## 1.3.0 - 2026-01-22
  ### Features
  - Add watercolor and minimalist styles to cover-image
  ### Fixes
  - Improve panel layout for long dialogues in comic

Changelog preview (zh):
  ## 1.3.0 - 2026-01-22
  ### 新功能
  - 为 cover-image 添加水彩和极简风格
  ### 修复
  - 改进 comic 长对话的面板布局

Commits to create:
  1. feat(baoyu-cover-image): add watercolor and minimalist styles
  2. fix(baoyu-comic): improve panel layout for long dialogues
  3. chore: release v1.3.0

No changes made. Run without --dry-run to execute.
```

## Example usage

```
/release-skills              # Auto-detect version bump
/release-skills --dry-run    # Preview only
/release-skills --minor      # Force minor bump
/release-skills --patch      # Force patch bump
/release-skills --major      # Force major bump (with confirmation)
/release-skills --backfill-releases  # Create missing GitHub Releases for existing tags
```

## When to use

Trigger this skill when the user requests:

- "release", "发布", "create release", "new version", "新版本"
- "bump version", "update version", "更新版本"
- "prepare release"
- "release notes", "GitHub Release", "回填 Release"
- "push to remote" (with uncommitted changes)

If the user says "just push" or "直接 push" with uncommitted changes, still follow all steps above first.
