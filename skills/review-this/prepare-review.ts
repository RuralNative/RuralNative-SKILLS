// Bounded review preparation for /review-this (automatic recovery).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Effectful operations live behind
// `prepare-review.mjs`, which reuses targets.ts, review-session.ts, the
// shared requirements/evidence validators, and the existing injectable `gh`
// runner. This module decides prerequisite observation, approved
// preparation/verification, and scoped evidence repair. It never exposes a
// general shell or arbitrary GitHub request interface.
//
// Order: resolve exactly one target, prepare the clean checkout, resolve
// governing policy and inspect verification commands before executing
// project code, classify and recover evidence or local verification
// prerequisites, recheck readiness, review once, and publish.
//
// Outcomes: ready, recoverable preparation, reviewable with blockers, and
// restricted. Implementation-evidence validity stays separate from whether a
// read-only review can proceed. A failed evidence validator never returns
// `current` merely to start review.

export type PrepareFailureClass =
  | "transient-read"
  | "correctable-input"
  | "revision-change"
  | "evidence-recoverable"
  | "policy-reviewable"
  | "local-prereq"
  | "publication-recoverable"
  | "auth-denied"
  | "restricted";

export type PrepareOutcomeKind = "ready" | "recoverable" | "reviewable-with-blockers" | "restricted";

export interface PrepareOutcome {
  kind: PrepareOutcomeKind;
  reason: string;
  /** Failure class when recoverable, for the one-attempt bound. */
  failureClass?: PrepareFailureClass;
}

export interface PrepareAttemptCounts {
  [key: string]: number;
}

/**
 * One corrective attempt per recoverable failure class. Re-read observations
 * before repeating an operation. A transient read failure or a correctable
 * input-format error may retry once; an authorization denial cannot be
 * bypassed through another tool. A revision change may trigger one fresh
 * preparation before review starts. Movement during review or publication
 * invalidates the pinned result and must not publish it as current. No
 * indefinite retry loop and no CI polling.
 */
export function decidePrepareRetry(
  failure: PrepareFailureClass,
  attempts: PrepareAttemptCounts,
): { retry: boolean; reason: string } {
  if (failure === "auth-denied" || failure === "restricted") {
    return {
      retry: false,
      reason: "authorization denials and restrictions cannot be bypassed through another tool",
    };
  }
  const used = attempts[failure] ?? 0;
  if (used >= 1) {
    return {
      retry: false,
      reason: `one corrective attempt per recoverable failure class already used for ${failure}; stop instead of looping`,
    };
  }
  switch (failure) {
    case "transient-read":
      return { retry: true, reason: "transient read failure may retry once after re-reading observations" };
    case "correctable-input":
      return { retry: true, reason: "correctable input-format error may retry once after re-reading observations" };
    case "revision-change":
      return { retry: true, reason: "revision change triggers one fresh preparation before review starts" };
    case "evidence-recoverable":
      return { retry: true, reason: "recoverable evidence failure gets one scoped repair attempt with revalidation" };
    case "policy-reviewable":
      return { retry: true, reason: "reviewable policy violation continues with blocking findings, not a retry" };
    case "local-prereq":
      return { retry: true, reason: "recoverable local prerequisite gets one allowed setup attempt" };
    case "publication-recoverable":
      return { retry: true, reason: "recoverable publication failure resumes the same verified pending review once" };
    default:
      return { retry: false, reason: `unknown failure class ${failure}; stop` };
  }
}

// --- Compatible runtime selection -------------------------------------------
//
// Select an available compatible runtime from the existing
// environment/version-manager installation without editing shell
// configuration.

export interface RuntimeCandidate {
  /** Executable path or version-manager name, e.g. `node` or `nodejs-24`. */
  name: string;
  major: number;
}

export function selectCompatibleRuntime(
  candidates: readonly RuntimeCandidate[],
  requiredMajor: number,
): { ok: true; selected: RuntimeCandidate } | { ok: false; reason: string } {
  const compatible = candidates.filter(
    (c) => Number.isInteger(c.major) && c.major >= requiredMajor && c.name.trim() !== "",
  );
  if (compatible.length === 0) {
    return {
      ok: false,
      reason: `no available runtime meets Node ${requiredMajor}+ without editing shell configuration`,
    };
  }
  // Prefer the smallest compatible major (least surprise), then lexical name.
  const sorted = [...compatible].sort((a, b) => a.major - b.major || a.name.localeCompare(b.name));
  return { ok: true, selected: sorted[0] };
}

// --- Locked install boundary -------------------------------------------------
//
// Derive the package manager and install boundary from the lockfile, project
// configuration, and CI. Install frozen/locked dependencies only into the
// established ignored dependency/cache locations. Preserve tracked files and
// unrelated local data. Disable unapproved lifecycle scripts; use only an
// existing approved script policy.

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface InstallBoundary {
  packageManager: PackageManager;
  /** Frozen install args, e.g. `["ci"]` for npm. */
  frozenArgs: readonly string[];
  /** Ignored dependency/cache locations that may be written. */
  allowedPaths: readonly string[];
  /** Lifecycle scripts disabled. */
  ignoreScripts: boolean;
}

export function deriveInstallBoundary(
  lockfile: "package-lock.json" | "pnpm-lock.yaml" | "yarn.lock" | "bun.lockb" | null,
  hasNpmCi: boolean,
): { ok: true; boundary: InstallBoundary } | { ok: false; reason: string } {
  if (lockfile === null) {
    return { ok: false, reason: "no lockfile observed; refusing to add dependencies or regenerate lockfiles" };
  }
  switch (lockfile) {
    case "package-lock.json":
      return {
        ok: true,
        boundary: {
          packageManager: "npm",
          frozenArgs: hasNpmCi ? ["ci", "--ignore-scripts"] : ["ci", "--ignore-scripts"],
          allowedPaths: ["node_modules/", ".npm/", "~/.npm/"],
          ignoreScripts: true,
        },
      };
    case "pnpm-lock.yaml":
      return {
        ok: true,
        boundary: {
          packageManager: "pnpm",
          frozenArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
          allowedPaths: ["node_modules/", "~/.pnpm-store/"],
          ignoreScripts: true,
        },
      };
    case "yarn.lock":
      return {
        ok: true,
        boundary: {
          packageManager: "yarn",
          frozenArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
          allowedPaths: ["node_modules/", ".yarn/cache/"],
          ignoreScripts: true,
        },
      };
    case "bun.lockb":
      return {
        ok: true,
        boundary: {
          packageManager: "bun",
          frozenArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
          allowedPaths: ["node_modules/", "~/.bun/"],
          ignoreScripts: true,
        },
      };
  }
}

const DENIED_SETUP_PATTERNS = [
  /add\b/i,
  /install\s+-g/i,
  /global/i,
  /migrate/i,
  /deploy/i,
  /publish/i,
  /login/i,
  /whoami/i,
  /token/i,
  /credential/i,
];

/** True when the install boundary itself is a known frozen boundary. */
export function isValidInstallBoundary(boundary: InstallBoundary): boolean {
  if (!boundary || typeof boundary.packageManager !== "string") return false;
  if (boundary.ignoreScripts !== true) return false;
  const pm = boundary.packageManager;
  if (pm !== "npm" && pm !== "pnpm" && pm !== "yarn" && pm !== "bun") return false;
  const frozen = [...boundary.frozenArgs];
  const allowedPaths = [...boundary.allowedPaths];
  if (pm === "npm") {
    if (frozen.length !== 2 || frozen[0] !== "ci" || frozen[1] !== "--ignore-scripts") return false;
    const okPaths = ["node_modules/", ".npm/", "~/.npm/"];
    if (allowedPaths.length === 0) return false;
    if (!allowedPaths.every((p) => okPaths.includes(p))) return false;
    return true;
  }
  const expectedPaths: Record<string, readonly string[]> = {
    pnpm: ["node_modules/", "~/.pnpm-store/"],
    yarn: ["node_modules/", ".yarn/cache/"],
    bun: ["node_modules/", "~/.bun/"],
  };
  if (frozen.length !== 3 || frozen[0] !== "install" || frozen[1] !== "--frozen-lockfile" || frozen[2] !== "--ignore-scripts") {
    return false;
  }
  const okPaths = expectedPaths[pm];
  if (allowedPaths.length === 0) return false;
  if (!allowedPaths.every((p) => (okPaths as readonly string[]).includes(p))) return false;
  return true;
}

const FORBIDDEN_SETUP_PREFIXES = [
  /^\s*git\s+(push|merge|reset|clean|stash|rebase|checkout|switch|branch)\b/i,
  /^\s*gh\s+(api|auth|pr\s+(edit|merge|create)|issue\s+(edit|create))\b/i,
  /^\s*(npm|pnpm|yarn|bun)\s+(add|install\s+[^-]|publish|deploy|login|whoami|update|upgrade)\b/i,
  /^\s*npx\s+/i,
  /^\s*(eval|source|\.)\s+/i,
  /^\s*export\s+/i,
];

const NPM_CI_ALLOWED_FLAGS = new Set(["--ignore-scripts", "--no-audit", "--no-fund"]);
const FROZEN_INSTALL_ALLOWED_FLAGS = new Set([
  "--frozen-lockfile",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
]);

/**
 * True when the setup command is within the approved frozen boundary.
 * Unknown flags, interpreter preloads, environment overrides, and
 * payload-selected commands never pass. Fork code remains static-review-only.
 * The boundary itself must be a known frozen boundary; an invented permissive
 * boundary never authorizes a command. Approved lists never override the
 * forbidden prefixes below: a payload that lists `git push` as approved still
 * fails.
 */
export function isAllowedSetupCommand(
  command: string,
  boundary: InstallBoundary,
  approvedScriptPolicy: readonly string[],
): boolean {
  const trimmed = command.trim();
  if (trimmed === "") return false;
  // No shell chaining/redirection, no interpreter evaluation/preloads.
  if (/[;&|><`$]/.test(trimmed)) return false;
  if (/\b(node|python|python3|ruby|perl)\s+-e\b/.test(trimmed)) return false;
  if (/\bLD_PRELOAD\b|\bNODE_OPTIONS\b|\bPYTHONPATH\b|\bRUBYOPT\b|\bPERL5OPT\b|\bBASH_ENV\b/.test(trimmed)) return false;
  if (/^\s*env\s+/i.test(trimmed)) return false;
  for (const denied of DENIED_SETUP_PATTERNS) {
    if (denied.test(trimmed)) return false;
  }
  for (const forbidden of FORBIDDEN_SETUP_PREFIXES) {
    if (forbidden.test(trimmed)) return false;
  }
  if (!isValidInstallBoundary(boundary)) return false;
  // Every approved entry must be a bare script name; a full shell string in
  // the approved list never authorizes anything through this path.
  const approvedScripts = approvedScriptPolicy.filter((s) => /^[A-Za-z0-9:_-]+$/.test(s));
  const pm = boundary.packageManager;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith(`${pm} `) || lower === pm) {
    const parts = trimmed.split(/\s+/);
    const sub = (parts[1] ?? "").toLowerCase();
    // Frozen installs only: no package names, only flags. `npm install <pkg>`
    // adds dependencies and never passes; npm's frozen form is `npm ci`.
    if (pm === "npm") {
      if (sub === "ci") {
        const rest = parts.slice(2);
        if (rest.length === 0) return false;
        if (!rest.includes("--ignore-scripts")) return false;
        for (const token of rest) {
          if (!token.startsWith("-")) return false;
          const flag = token.split("=")[0];
          if (!NPM_CI_ALLOWED_FLAGS.has(flag)) return false;
          if (/^--ignore-scripts=/.test(token) && token !== "--ignore-scripts") return false;
          if (/^--prefix/.test(token) || /^--cache/.test(token) || /^--global/.test(token) || token === "-g") return false;
        }
        if (rest.some((t) => /^--prefix|^--cache|^-g$|^--global/.test(t))) return false;
        return true;
      }
      if (sub === "run") {
        const script = parts[2] ?? "";
        if (!/^[A-Za-z0-9:_-]+$/.test(script)) return false;
        // No extra arguments: `npm run verify -- --write` must not pass as
        // `verify`. Callers needing arguments use an explicit node entry.
        if (parts.length > 3) return false;
        return approvedScripts.includes(script);
      }
      // All other npm subcommands (install, update, publish, etc.) are denied.
      return false;
    }
    // pnpm/yarn/bun frozen installs: require --frozen-lockfile and
    // --ignore-scripts with no package names and no location overrides.
    if (sub === "install") {
      const rest = parts.slice(2);
      if (!rest.includes("--frozen-lockfile")) return false;
      if (!rest.includes("--ignore-scripts")) return false;
      for (const token of rest) {
        if (!token.startsWith("-")) return false;
        const flag = token.split("=")[0];
        if (!FROZEN_INSTALL_ALLOWED_FLAGS.has(flag)) return false;
        if (/^--prefix|^--cache|^-g$|^--global|^--store-dir|^--cache-dir/.test(token)) return false;
      }
      return true;
    }
    if (sub === "run") {
      const script = parts[2] ?? "";
      if (!/^[A-Za-z0-9:_-]+$/.test(script)) return false;
      if (parts.length > 3) return false;
      return approvedScripts.includes(script);
    }
    return false;
  }
  // Approved verification commands established by checked-in configuration:
  // only an explicit `node <relative .js/.mjs/.cjs>` entry with safe args.
  // The command must appear verbatim in the approved list expressed as the
  // same full string; bare script names never match here.
  if ((approvedScriptPolicy as readonly string[]).includes(trimmed)) {
    const nodeMatch = trimmed.match(/^node\s+([A-Za-z0-9._/-]+\.m?js|\S+\.cjs)(\s+.*)?$/);
    if (!nodeMatch) return false;
    const target = nodeMatch[1];
    if (target.includes("..") || target.startsWith("/") || target.startsWith("~")) return false;
    const args = (nodeMatch[2] ?? "").trim();
    if (args !== "" && /[;&|><`$]/.test(args)) return false;
    return true;
  }
  return false;
}

/** Tracked-file cleanliness after setup/checks. Never auto-clean. */
export function decideCleanlinessAfterSetup(
  trackedDirty: boolean,
): { ok: boolean; reason: string } {
  if (trackedDirty) {
    return {
      ok: false,
      reason: "tracked files changed during setup/checks; never clean, reset, stash, or discard unexpected modifications to restore the appearance of a clean run",
    };
  }
  return { ok: true, reason: "tracked files preserved" };
}

// --- Evidence recovery orchestration ----------------------------------------
//
// If real verification fails, retain the old evidence unchanged and carry
// the observed failure into the review. Do not fabricate a passing envelope.
// When the target, requirements, and governing rules remain trustworthy,
// continue the read-only review and publish its blockers. If those essential
// facts cannot be established, return an explicit restriction.

export type EvidenceRecoveryPlan =
  | { action: "no-repair-needed"; reason: string }
  | { action: "repair-and-revalidate"; reason: string }
  | { action: "retain-and-carry-failure"; reason: string; failure: string }
  | { action: "restrict"; reason: string };

export function planEvidenceRecovery(input: {
  targetTrustworthy: boolean;
  requirementsTrustworthy: boolean;
  governingRulesTrustworthy: boolean;
  recoveryAllowed: boolean;
  verificationPassed: boolean;
  verificationFailure?: string;
}): EvidenceRecoveryPlan {
  if (!input.targetTrustworthy || !input.requirementsTrustworthy || !input.governingRulesTrustworthy) {
    return {
      action: "restrict",
      reason: "essential facts (target, requirements, or governing rules) cannot be established; return an explicit restriction rather than a counterfeit completed handoff",
    };
  }
  if (input.verificationPassed && input.recoveryAllowed) {
    return { action: "repair-and-revalidate", reason: "full current-scope proof revalidated; render a candidate block and require workflow-cli.mjs evidence to accept it before publication" };
  }
  if (input.verificationPassed && !input.recoveryAllowed) {
    return { action: "no-repair-needed", reason: "evidence is current; no repin is needed" };
  }
  return {
    action: "retain-and-carry-failure",
    reason: "real verification failed; retain the old evidence unchanged and carry the observed failure into the review without fabricating a passing envelope",
    failure: input.verificationFailure ?? "verification failed on the current head",
  };
}

// --- Publication resume ------------------------------------------------------
//
// After an interrupted submit, automatically resume the same verified pending
// review once, with unchanged pins and verified author/ownership. A matching
// submitted review is success after validation, not a reason to create
// another review. Ambiguous identities, a changed body/commit, dismissal, or
// persistent unreadability remain restrictions. Keep CI one-read/no-poll;
// publish failing or pending verification truthfully.

export function decidePublicationResume(input: {
  hasResumeId: boolean;
  pinsUnchanged: boolean;
  authorOwnershipVerified: boolean;
  dismissed: boolean;
  ambiguous: boolean;
  unreadable: boolean;
  alreadySubmittedMatching: boolean;
}): { action: "resume-once" | "adopt-matching" | "stop"; reason: string } {
  if (input.dismissed) return { action: "stop", reason: "the identified review was dismissed; never republish a dismissed review" };
  if (input.ambiguous) return { action: "stop", reason: "ambiguous review identities; never guess which review belongs to this publication" };
  if (input.unreadable) return { action: "stop", reason: "the identified review is persistently unreadable; stop as a restriction" };
  if (!input.pinsUnchanged) return { action: "stop", reason: "pins moved during review or publication; the pinned result is invalid and must not publish as current" };
  if (!input.authorOwnershipVerified) return { action: "stop", reason: "author/ownership is unverified; stop instead of publishing" };
  if (input.alreadySubmittedMatching) return { action: "adopt-matching", reason: "a matching submitted review is success after validation, not a reason to create another review" };
  if (input.hasResumeId) return { action: "resume-once", reason: "resume the same verified pending review once with unchanged pins" };
  return { action: "stop", reason: "no resumable review identified" };
}
