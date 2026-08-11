# RuralNative-SKILLS

A public distribution shelf for agent skills. The repository's purpose is to
publish installable skills, not merely to host them locally.

## Language

**Skill**:
A distributable unit of agent instructions — a directory containing
`SKILL.md` and its supporting reference files.
_Avoid_: Prompt, plugin

**Skill identity**:
The `name` declared in a skill's `SKILL.md` frontmatter. The registry keys on
it, and it must equal the folder name the skill lives in.
_Avoid_: Slug, skill name (when the folder name is meant)

**Distribution shelf**:
The `skills/` directory at the repository root. The registry's discovery
engine walks this directory to find installable skills.
_Avoid_: Root folder, skills folder (when the convention is meant)

**Registry lane**:
The distribution channel where consumers install a skill straight from the
public GitHub repository via the skills CLI (`npx skills add`). No npm
packaging is involved.
_Avoid_: npx install, package install

**Catalog layout**:
The shelf shape of `skills/<skill-identity>/`, as opposed to a single skill
folder at the repository root.
_Avoid_: Monorepo, folder structure
