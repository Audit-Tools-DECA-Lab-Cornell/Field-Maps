import { describe, expect, it } from "vitest";
import {
  type ObservationIdentity,
  ownershipProblem,
  packageSwitchProblem,
  recoveryProblem,
} from "./ownership";

const started: ObservationIdentity = {
  id: "1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b",
  startedAt: "2026-09-22T14:31:00.000Z",
  owner: "account-a",
  packageId: "riverside-play-study",
  packageName: "Riverside Play Study",
};

describe("An observation belongs to the account that started it", () => {
  it("writes under the account and study it was started in", () => {
    // Given an observation started while signed into one account.
    // When it is saved under the same account and package.
    // Then nothing blocks it.
    expect(ownershipProblem(started, "account-a", "riverside-play-study")).toBeNull();
  });

  it("refuses to write research data under an account that did not collect it", () => {
    // Given the observer signs out, or signs in as someone else, mid-observation.
    const problem = ownershipProblem(started, "account-b", "riverside-play-study");
    // Then the record is not attributed to the new account, and the draft is left to its owner.
    expect(problem).toMatch(/account or study changed/i);
  });

  it("refuses to write it against a different study's form and round context", () => {
    // Given the package changed underneath the open observation.
    const problem = ownershipProblem(started, "account-a", "sample-garden");
    // Then its answers cannot be stamped with another package's form.
    expect(problem).not.toBeNull();
  });

  it("treats the practice scope as an account like any other", () => {
    // Given an observation started before signing in.
    const practice = { ...started, owner: "local" };
    // Then signing in does not sweep it into the account's queue.
    expect(ownershipProblem(practice, "account-a", "riverside-play-study")).not.toBeNull();
    expect(ownershipProblem(practice, "local", "riverside-play-study")).toBeNull();
  });
});

describe("Opening another study", () => {
  it("is free when nothing is in progress", () => {
    // Given no observation open.
    // Then any package can be opened.
    expect(packageSwitchProblem(null, "sample-garden")).toBeNull();
  });

  it("is blocked while an observation is open elsewhere, and names where", () => {
    // Given an unfinished observation in one study.
    const problem = packageSwitchProblem(started, "sample-garden");
    // Then the switch is refused and the observer is told which study holds it.
    expect(problem).toContain("Riverside Play Study");
  });

  it("still allows reopening the study the observation belongs to", () => {
    // Given the observer navigates back through the brief to the same study.
    // Then their observation is not in their way.
    expect(packageSwitchProblem(started, "riverside-play-study")).toBeNull();
  });
});

describe("Resuming a recovered draft", () => {
  it("resumes a draft the signed-in account started", () => {
    // Given a draft left behind by the account now signed in.
    // Then it can be taken back up.
    expect(recoveryProblem("account-a", "account-a")).toBeNull();
  });

  it("refuses a draft left over from another account", () => {
    // Given account A's draft is still offered after switching to account B, which has none.
    const problem = recoveryProblem("account-a", "account-b");
    // Then resuming it cannot bind A's answers to B, and says how to get them back.
    expect(problem).toMatch(/different account/i);
    expect(problem).toMatch(/sign back into/i);
  });

  it("keeps practice drafts out of an account, and account drafts out of practice", () => {
    // Given a draft started before signing in, and one started while signed in.
    // Then neither is offered to the other side of that boundary.
    expect(recoveryProblem("local", "account-a")).not.toBeNull();
    expect(recoveryProblem("account-a", "local")).not.toBeNull();
    expect(recoveryProblem("local", "local")).toBeNull();
  });
});
