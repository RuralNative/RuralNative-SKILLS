// Affected-test evidence for implementation and fixes (#157, #152).

export interface TestSelection {
  affectedSeams: readonly string[];
  selectedTests: readonly string[];
  mappingDefensible: boolean;
  reason?: string;
}

export interface VerificationPlan {
  runTargetedTests: boolean;
  runFullRepositoryGate: boolean;
  reason: string;
}

export function verificationPlan(selection: TestSelection): VerificationPlan {
  if (!selection.mappingDefensible) {
    return {
      runTargetedTests: false,
      runFullRepositoryGate: true,
      reason: selection.reason ?? "affected-test mapping is uncertain",
    };
  }
  return {
    runTargetedTests: selection.selectedTests.length > 0,
    runFullRepositoryGate: false,
    reason: "affected-seam mapping is defensible; reserve the full gate for the final revision",
  };
}
