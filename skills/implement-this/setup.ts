// Measured setup and dependency-state reconciliation (#157, parent #152).

export interface DependencySetupState {
  setupManifestDigest: string | null;
  worktreeNodeModulesPath: string;
}

export interface DependencyStateDecision {
  rerunSetup: boolean;
  reason: "dependency-state-changed" | "dependency-state-unchanged";
}

export function reconcileDependencyState(
  checkedOutManifestDigest: string,
  setup: DependencySetupState,
): DependencyStateDecision {
  const rerun =
    setup.setupManifestDigest === null ||
    checkedOutManifestDigest !== setup.setupManifestDigest;
  return {
    rerunSetup: rerun,
    reason: rerun ? "dependency-state-changed" : "dependency-state-unchanged",
  };
}

export interface SetupMeasurement {
  baselineMs: number;
  candidateMs?: number;
  candidateDeterministic?: boolean;
}

export interface PackageCacheDecision {
  useMeasuredOptimization: boolean;
  options: readonly string[];
  reason: string;
}

export function chooseMeasuredPackageOptions(
  measurement: SetupMeasurement,
): PackageCacheDecision {
  const candidateImproves =
    measurement.candidateMs !== undefined &&
    measurement.candidateMs < measurement.baselineMs;
  if (!candidateImproves || measurement.candidateDeterministic !== true) {
    return {
      useMeasuredOptimization: false,
      options: [],
      reason: "keep default setup until measured deterministic data shows a benefit",
    };
  }
  return {
    useMeasuredOptimization: true,
    options: ["offline-preferred", "no-audit", "no-fund"],
    reason: "measured deterministic setup is faster",
  };
}

export function worktreeNodeModulesPath(worktreePath: string): string {
  return `${worktreePath.replace(/[\\/]+$/, "")}/node_modules`;
}
