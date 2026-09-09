// One complete, verifiable review publication (ADR-0035, narrowed by
// ADR-0038): create a pending review at the pinned commit, retrieve the
// native identity, submit that same review with the final body, read back,
// and validate. Native states follow the GitHub REST contract: PENDING until
// submission, then COMMENTED/APPROVED/CHANGES_REQUESTED; publication claims
// success only after the read-back passes the full handoff provenance
// validation. Host-shaped fakes allocate IDs only on creation and return
// persisted bodies; no test calls live GitHub.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  composeReviewPublicationBody,
  composeReviewPublicationBodyFor,
  isSubmittedReviewState,
  publishReviewPublication,
  type ReadBackReview,
  type ReviewPublicationInput,
  type ReviewPublicationTransport,
} from "../publish-review.ts";
import { renderReviewHandoff, type ReviewHandoffInput } from "../workflow-state.ts";
import { fakeReviewPublicationHost } from "./fakes.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

function handoffInput(overrides: Partial<ReviewHandoffInput> = {}): ReviewHandoffInput {
  return {
    repository: "o/r",
    prNumber: 300,
    reviewedHeadSha: "abc123",
    reviewedBaseSha: "base1",
    closesTicket: 288,
    requirementsRevision:
      "requirements-adapted-v1:parent=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;ticket=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewPolicyRevision: "review-contract-v1:REVIEW.md\th1",
    verificationCommand: "node --test tests/review-handoff.test.ts",
    verificationResult: "review checks observed",
    verificationPassed: true,
    findings: [],
    provenance: {
      reviewId: "555",
      reviewAuthor: "reviewer",
      reviewedCommit: "abc123",
      reviewedAt: "",
      sourceUrl: "",
      reviewerPermission: "write",
      commentIds: [],
    },
    ...overrides,
  };
}

function input(overrides: Partial<ReviewPublicationInput> = {}): ReviewPublicationInput {
  return {
    repository: "o/r",
    prNumber: 300,
    commitSha: "abc123",
    reviewProse: "## Standards\n\nok\n\n## Spec\n\nno findings",
    handoff: handoffInput(),
    ...overrides,
  };
}

describe("review publication procedure", () => {
  test("creates one pending review, submits it with COMMENT, and reads it back COMMENTED", async () => {
    const fake = fakeReviewPublicationHost();
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "published");
    if (outcome.status !== "published") return;
    assert.equal(outcome.readBack.state, "COMMENTED");
    assert.equal(isSubmittedReviewState(outcome.readBack.state), true);
    assert.equal(outcome.readBack.body, outcome.body);
    assert.equal(outcome.readBack.commitSha, "abc123");
    assert.equal(outcome.readBack.commentIds.length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("submit")).length, 1);
    assert.ok(fake.calls.some((c) => c.includes("event=COMMENT")));
  });
  test("the published body carries the captured native review ID, never a placeholder", async () => {
    const fake = fakeReviewPublicationHost();
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "published");
    if (outcome.status !== "published") return;
    assert.ok(outcome.body.includes(`- Review ID: ${outcome.reviewId}`));
    assert.equal(outcome.body.includes("- Review ID: 555"), false);
    assert.ok(outcome.readBack.body.includes(`- Review ID: ${outcome.reviewId}`));
  });
  test("an explicit submit event maps to its native submitted state", async () => {
    const fake = fakeReviewPublicationHost();
    const outcome = await publishReviewPublication(input({ submitEvent: "APPROVE" }), fake);
    assert.equal(outcome.status, "published");
    if (outcome.status !== "published") return;
    assert.equal(outcome.readBack.state, "APPROVED");
    assert.ok(fake.calls.some((c) => c.includes("event=APPROVE")));
  });
  test("create failure with no pending review stops without a review identity", async () => {
    const fake = fakeReviewPublicationHost({ failCreate: "permission denied" });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "create");
    assert.equal(outcome.reviewId, undefined);
  });
  test("submit failure with a readable pending review stops and names the review for resume", async () => {
    const fake = fakeReviewPublicationHost({ failSubmit: "network dropped" });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "submit");
    assert.ok(outcome.reviewId !== undefined);
    const review = fake.host.get(outcome.reviewId!);
    assert.ok(review !== undefined);
    assert.equal(review.state, "PENDING");
  });
  test("resume submits the identified review without creating a second one", async () => {
    const fake = fakeReviewPublicationHost({ failSubmit: "network dropped" });
    const first = await publishReviewPublication(input(), fake);
    assert.equal(first.status, "stop");
    const resumed = await publishReviewPublication(
      input({ resumeReviewId: first.status === "stop" ? first.reviewId : undefined }),
      fake,
    );
    assert.equal(resumed.status, "published");
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
  });
  test("an already-submitted identical review resumes without a redundant write", async () => {
    const fake = fakeReviewPublicationHost();
    const first = await publishReviewPublication(input(), fake);
    assert.equal(first.status, "published");
    const resumed = await publishReviewPublication(
      input({ resumeReviewId: first.status === "published" ? first.reviewId : undefined }),
      fake,
    );
    assert.equal(resumed.status, "published");
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("submit")).length, 1);
  });
  test("a submitted review with a different body never resumes", async () => {
    const fake = fakeReviewPublicationHost();
    const first = await publishReviewPublication(input(), fake);
    assert.equal(first.status, "published");
    const other = await publishReviewPublication(
      input({ resumeReviewId: first.status === "published" ? first.reviewId : undefined, reviewProse: "changed prose" }),
      fake,
    );
    assert.equal(other.status, "stop");
  });
  test("a dismissed review never resumes and never republishes", async () => {
    const fake = fakeReviewPublicationHost();
    const first = await publishReviewPublication(input(), fake);
    assert.equal(first.status, "published");
    if (first.status !== "published") return;
    const review = fake.host.get(first.reviewId)!;
    fake.host.set(first.reviewId, { ...review, state: "DISMISSED" });
    const outcome = await publishReviewPublication(
      input({ resumeReviewId: first.reviewId }),
      fake,
    );
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "read-back");
  });
  test("a read-back in a non-submitted state after submit stops", async () => {
    const fake = fakeReviewPublicationHost();
    const first = await publishReviewPublication(input(), fake);
    assert.equal(first.status, "published");
    if (first.status !== "published") return;
    const stuck: ReviewPublicationTransport = {
      name: "stuck",
      async createPendingReview() {
        return { ok: true, reviewId: "x" };
      },
      async submitReview() {
        return { ok: true };
      },
      async readBackReview() {
        return { reviewId: "x", author: "reviewer", commitSha: "abc123", state: "PENDING", body: "", commentIds: [] };
      },
      async listPendingReviews() {
        return [];
      },
    };
    const outcome = await publishReviewPublication(input(), stuck);
    assert.equal(outcome.status, "stop");
    assert.equal(outcome.status === "stop" && outcome.step, "read-back");
  });
  test("lost read-back after submit stops without claiming publication", async () => {
    const fake = fakeReviewPublicationHost({ failReadBack: true });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "read-back");
    assert.ok(outcome.reviewId !== undefined);
  });
  test("composed body carries the handoff block exactly once", () => {
    const body = composeReviewPublicationBody("## Standards\n\nok", handoffInput());
    assert.equal((body.match(/ruralnative:review-handoff:start/g) ?? []).length, 1);
    assert.equal((body.match(/ruralnative:review-handoff:end/g) ?? []).length, 1);
    assert.ok(body.includes(renderReviewHandoff(handoffInput())));
  });
  test("read-back body equality uses the exact submitted body", async () => {
    const fake = fakeReviewPublicationHost();
    const inputValue = input();
    const outcome = await publishReviewPublication(inputValue, fake);
    assert.equal(outcome.status, "published");
    if (outcome.status === "published") {
      const readBack = fake.host.get(outcome.reviewId)!;
      assert.equal(readBack.body, outcome.body);
      assert.equal(
        outcome.body,
        composeReviewPublicationBodyFor(inputValue, outcome.reviewId),
      );
    }
  });
});

describe("lost create response recovery by discovery", () => {
  test("a lost create response adopts the single pending review and publishes once", async () => {
    const fake = fakeReviewPublicationHost({
      failCreate: "response lost after creation",
      loseCreateResponse: true,
    });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "published");
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("discover")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("submit")).length, 1);
  });
  test("a lost create response with no pending review stops without retrying", async () => {
    const fake = fakeReviewPublicationHost({ failCreate: "response lost after creation" });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "create");
    assert.equal(outcome.reviewId, undefined);
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("submit")).length, 0);
  });
  test("a lost create response with several pending reviews stops as ambiguous", async () => {
    const fake = fakeReviewPublicationHost({
      failCreate: "response lost after creation",
      loseCreateResponse: true,
    });
    fake.host.set("pre-1", {
      reviewId: "pre-1",
      author: "reviewer",
      commitSha: "abc123",
      state: "PENDING",
      body: "",
      sourceUrl: "https://github.com/o/r/pull/300#review-pre-1",
      commentIds: [],
    });
    fake.host.set("pre-2", {
      reviewId: "pre-2",
      author: "reviewer",
      commitSha: "abc123",
      state: "PENDING",
      body: "",
      sourceUrl: "https://github.com/o/r/pull/300#review-pre-2",
      commentIds: [],
    });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "create");
    assert.ok(String(outcome.reason).includes("pending reviews"));
  });
  test("unavailable discovery after a lost create response stops", async () => {
    const fake = fakeReviewPublicationHost({
      failCreate: "response lost after creation",
      loseCreateResponse: true,
      failDiscovery: true,
    });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "create");
    assert.ok(String(outcome.reason).includes("discovery is unavailable"));
  });
});

describe("read-back provenance validation before success", () => {
  test("a native author that disagrees with the published handoff stops publication", async () => {
    const fake = fakeReviewPublicationHost({ author: "intruder" });
    const outcome = await publishReviewPublication(input(), fake);
    assert.equal(outcome.status, "stop");
    if (outcome.status !== "stop") return;
    assert.equal(outcome.step, "read-back");
    assert.ok(String(outcome.reason).includes("does not validate"));
    assert.ok(outcome.reviewId !== undefined);
  });
  test("approved read-backs with matching provenance publish", async () => {
    const outcome = await publishReviewPublication(input({ submitEvent: "APPROVE" }), fakeReviewPublicationHost());
    assert.equal(outcome.status, "published");
  });
  test("an empty host transport never fabricates IDs", async () => {
    const empty: ReviewPublicationTransport = {
      name: "empty",
      async createPendingReview() {
        return { ok: false, reason: "no host" };
      },
      async submitReview() {
        return { ok: false, reason: "no host" };
      },
      async readBackReview() {
        return null;
      },
      async listPendingReviews() {
        return [];
      },
    };
    const outcome = await publishReviewPublication(input(), empty);
    assert.equal(outcome.status, "stop");
    assert.equal(outcome.status === "stop" && outcome.step, "create");
  });
});

describe("submitted state model", () => {
  test("only native submitted states count as submitted", () => {
    assert.equal(isSubmittedReviewState("COMMENTED"), true);
    assert.equal(isSubmittedReviewState("approved"), true);
    assert.equal(isSubmittedReviewState("CHANGES_REQUESTED"), true);
    assert.equal(isSubmittedReviewState("SUBMITTED"), false);
    assert.equal(isSubmittedReviewState("PENDING"), false);
    assert.equal(isSubmittedReviewState("DISMISSED"), false);
  });
  test("read-back type covers pending, submitted, and dismissed states", () => {
    const readBack: ReadBackReview = {
      reviewId: "1",
      author: "reviewer",
      commitSha: "abc123",
      state: "CHANGES_REQUESTED",
      body: "body",
      submittedAt: "2026-09-09T09:00:00Z",
      commentIds: ["c-1"],
    };
    assert.equal(readBack.state, "CHANGES_REQUESTED");
  });
});
