# Vendor facts

### Kilo Agent Manager

- Retrieved: 2026-08-23 from the official rendered page; pin the `Kilo-Org/kilocode` `main` source at `ff74e2ea3fcd3a8fd43caf9751bbeaa3e30cead8` and page blob `102d9f6461ee23adda2fcfbfa3727e5f16a93dd8`.
- Facts: the VS Code extension documents the `agent_manager` chat tool with worktree/local start, overview, prompt, stop, and move controls. Managed worktrees live under `.kilo/worktrees/`; Agent Manager UI state lives in `.kilo/agent-manager.json`.
- Gotchas: `local` sessions have no worktree isolation; new managed worktrees must start from the main repository; stopping a session is not the documented managed-worktree close action; local sessions cannot be moved into sections.
- Closure gotcha: the reference says managed closure removes the checkout and local branch, while the Workflows page says the branch is preserved after a merge. Do not depend on branch retention, delete managed directories, or edit Agent Manager state directly.
- Full docs: fetch on demand - https://kilo.ai/docs/automate/agent-manager and the pinned source https://github.com/Kilo-Org/kilocode/blob/ff74e2ea3fcd3a8fd43caf9751bbeaa3e30cead8/packages/kilo-docs/pages/automate/agent-manager.md.

### Kilo Agent Manager Workflows

- Retrieved: 2026-08-23 from the official rendered page; pin the `Kilo-Org/kilocode` `main` source at `ff74e2ea3fcd3a8fd43caf9751bbeaa3e30cead8` and page blob `195adb957c851b5761e8c0ba30d5b10ab9949625`.
- Facts: the workflow guide recommends Agent Manager for independent work, describes separate sessions in isolated worktrees, and says worktree isolation covers filesystem and git state, not semantic conflicts.
- Gotchas: sessions on one worktree share its branch and files; dependencies, caches, and local services multiply across worktrees; setup and run scripts receive `WORKTREE_PATH` and `REPO_PATH`; external resources outlive managed checkout closure.
- Full docs: fetch on demand - https://kilo.ai/docs/automate/agent-manager-workflows and the pinned source https://github.com/Kilo-Org/kilocode/blob/ff74e2ea3fcd3a8fd43caf9751bbeaa3e30cead8/packages/kilo-docs/pages/automate/agent-manager-workflows.md.
