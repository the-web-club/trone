import { describe, expect, it } from "vitest";
import {
  assertCanEditFeatureRequest,
  assertCanManageFeatureRequests,
  assertCanMergeFeatureRequests,
  assertCanVoteOnFeatureRequest,
  canEditFeatureRequest,
  canWriteFeatureRequests,
  planMergeVotes,
} from "@/lib/feature-request-access";
import { AppError } from "@/lib/errors";

const admin = { id: "admin-1", role: "admin" };
const author = { id: "user-1", role: "user" };
const other = { id: "user-2", role: "user" };
const viewer = { id: "viewer-1", role: "viewer" };

describe("feature request authorization", () => {
  it("blocks viewers from writing", () => {
    expect(canWriteFeatureRequests(viewer)).toBe(false);
    expect(canWriteFeatureRequests(author)).toBe(true);
  });

  it("lets authors edit their own open request, not others", () => {
    const open = { authorUserId: author.id, status: "OPEN" as const };
    expect(canEditFeatureRequest(author, open)).toBe(true);
    expect(canEditFeatureRequest(other, open)).toBe(false);
    expect(canEditFeatureRequest(admin, open)).toBe(true);
  });

  it("forbids editing a merged request, including for admins", () => {
    const merged = { authorUserId: author.id, status: "MERGED" as const };
    expect(canEditFeatureRequest(admin, merged)).toBe(false);
    expect(() => assertCanEditFeatureRequest(admin, merged)).toThrow(AppError);
  });

  it("forbids ordinary users from admin actions", () => {
    expect(() => assertCanManageFeatureRequests(author)).toThrow(AppError);
    expect(() => assertCanManageFeatureRequests(admin)).not.toThrow();
  });

  it("blocks votes on merged requests", () => {
    expect(() => assertCanVoteOnFeatureRequest("MERGED")).toThrow(AppError);
    expect(() => assertCanVoteOnFeatureRequest("OPEN")).not.toThrow();
  });
});

describe("feature request merge rules", () => {
  it("rejects merging a request with itself", () => {
    expect(() =>
      assertCanMergeFeatureRequests(
        { id: "a", status: "OPEN", mergedIntoId: null },
        { id: "a", status: "OPEN", mergedIntoId: null },
      ),
    ).toThrow(/zichzelf/);
  });

  it("rejects a target that is already merged", () => {
    expect(() =>
      assertCanMergeFeatureRequests(
        { id: "a", status: "OPEN", mergedIntoId: null },
        { id: "b", status: "MERGED", mergedIntoId: "c" },
      ),
    ).toThrow(/niet is samengevoegd/);
  });

  it("is idempotent when the same merge is repeated", () => {
    expect(
      assertCanMergeFeatureRequests(
        { id: "a", status: "MERGED", mergedIntoId: "b" },
        { id: "b", status: "OPEN", mergedIntoId: null },
      ),
    ).toBe("idempotent");
  });

  it("rejects a different merge after the source is already merged", () => {
    expect(() =>
      assertCanMergeFeatureRequests(
        { id: "a", status: "MERGED", mergedIntoId: "b" },
        { id: "c", status: "OPEN", mergedIntoId: null },
      ),
    ).toThrow(/al samengevoegd/);
  });

  it("rejects a cycle when the target already points at the source", () => {
    expect(() =>
      assertCanMergeFeatureRequests(
        { id: "a", status: "OPEN", mergedIntoId: null },
        { id: "b", status: "OPEN", mergedIntoId: "a" },
      ),
    ).toThrow(/lus/);
  });

  it("keeps one vote per user when combining source and target", () => {
    expect(planMergeVotes(["u1", "u2", "u3"], ["u2", "u4"])).toEqual({
      moveUserIds: ["u1", "u3"],
      dropUserIds: ["u2"],
    });
  });

  it("drops duplicate source votes for the same user", () => {
    expect(planMergeVotes(["u1", "u1"], [])).toEqual({
      moveUserIds: ["u1"],
      dropUserIds: ["u1"],
    });
  });
});
