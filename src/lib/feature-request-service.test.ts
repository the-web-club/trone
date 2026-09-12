import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const {
  mockFindUnique,
  mockFindFirst,
  mockFindMany,
  mockCreate,
  mockUpdate,
  mockUpdateMany,
  mockDeleteMany,
  mockCount,
  mockTransaction,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockCount: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    featureRequest: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      count: mockCount,
    },
    featureRequestVote: {
      create: mockCreate,
      deleteMany: mockDeleteMany,
      updateMany: mockUpdateMany,
    },
    $transaction: mockTransaction,
  }),
}));

vi.mock("@/lib/slug", () => ({
  allocateUniqueSlug: vi.fn(async () => "demo-verzoek"),
}));

vi.mock("@/lib/id", async () => {
  const actual = await vi.importActual<typeof import("@/lib/id")>("@/lib/id");
  return {
    ...actual,
    createId: () => "new-id",
  };
});

import {
  addFeatureRequestVote,
  buildFeatureRequestListWhere,
  mergeFeatureRequests,
  removeFeatureRequestVote,
  updateFeatureRequest,
  updateFeatureRequestStatus,
} from "@/lib/feature-request-service";

const admin = { id: "admin-1", role: "admin" };
const user = { id: "user-1", role: "user" };
const other = { id: "user-2", role: "user" };

describe("buildFeatureRequestListWhere", () => {
  it("combines search, type, active status and own votes", () => {
    const where = buildFeatureRequestListWhere(
      {
        zoeken: "sidebar",
        type: "bug",
        status: "actief",
        mijnStemmen: true,
        sortering: "populair",
      },
      "user-1",
    );

    expect(where).toEqual({
      AND: [
        { status: { in: ["OPEN", "PLANNED", "IN_PROGRESS"] } },
        { type: "BUG" },
        { votes: { some: { userId: "user-1" } } },
        {
          OR: [
            { title: { contains: "sidebar" } },
            { description: { contains: "sidebar" } },
          ],
        },
      ],
    });
  });
});

describe("feature request votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue({ id: "req-1", status: "OPEN" });
  });

  it("treats a unique constraint as an idempotent add", async () => {
    mockCreate.mockRejectedValue({ code: "P2002" });
    await expect(addFeatureRequestVote("req-1", user)).resolves.toEqual({
      voted: true,
      created: false,
    });
  });

  it("adds a vote when none exists", async () => {
    mockCreate.mockResolvedValue({ id: "vote-1" });
    await expect(addFeatureRequestVote("req-1", user)).resolves.toEqual({
      voted: true,
      created: true,
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { id: "new-id", requestId: "req-1", userId: "user-1" },
    });
  });

  it("removes a vote idempotently", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    await expect(removeFeatureRequestVote("req-1", user)).resolves.toEqual({
      voted: false,
      removed: 0,
    });
  });

  it("rejects votes on merged requests", async () => {
    mockFindUnique.mockResolvedValue({ id: "req-1", status: "MERGED" });
    await expect(addFeatureRequestVote("req-1", user)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("feature request mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents a regular user from editing someone else's request", async () => {
    mockFindUnique.mockResolvedValue({
      id: "req-1",
      authorUserId: user.id,
      status: "OPEN",
      slug: "demo",
    });
    await expect(
      updateFeatureRequest("req-1", { title: "Nieuwe titel" }, other),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("prevents a regular user from changing status", async () => {
    await expect(
      updateFeatureRequestStatus("req-1", "PLANNED", user),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("mergeFeatureRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves unique votes and marks the source as merged", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        featureRequest: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
            if (where.id === "source") {
              return {
                id: "source",
                slug: "oud",
                status: "OPEN",
                mergedIntoId: null,
                votes: [{ userId: "u1" }, { userId: "u2" }],
              };
            }
            return {
              id: "target",
              slug: "nieuw",
              status: "OPEN",
              mergedIntoId: null,
              votes: [{ userId: "u2" }],
            };
          }),
          update: mockUpdate,
        },
        featureRequestVote: {
          deleteMany: mockDeleteMany,
          updateMany: mockUpdateMany,
        },
      };
      return fn(tx);
    });
    mockUpdate.mockResolvedValue({});
    mockDeleteMany.mockResolvedValue({ count: 1 });
    mockUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      mergeFeatureRequests("source", "target", admin),
    ).resolves.toEqual({
      sourceSlug: "oud",
      targetSlug: "nieuw",
      idempotent: false,
    });

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { requestId: "source", userId: { in: ["u2"] } },
    });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { requestId: "source", userId: { in: ["u1"] } },
      data: { requestId: "target" },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "source" },
      data: { status: "MERGED", mergedIntoId: "target" },
    });
  });

  it("repeats the same merge without moving votes again", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        featureRequest: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
            if (where.id === "source") {
              return {
                id: "source",
                slug: "oud",
                status: "MERGED",
                mergedIntoId: "target",
                votes: [{ userId: "u1" }],
              };
            }
            return {
              id: "target",
              slug: "nieuw",
              status: "OPEN",
              mergedIntoId: null,
              votes: [{ userId: "u1" }],
            };
          }),
          update: mockUpdate,
        },
        featureRequestVote: {
          deleteMany: mockDeleteMany,
          updateMany: mockUpdateMany,
        },
      };
      return fn(tx);
    });

    await expect(
      mergeFeatureRequests("source", "target", admin),
    ).resolves.toEqual({
      sourceSlug: "oud",
      targetSlug: "nieuw",
      idempotent: true,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("blocks merge for non-admins", async () => {
    await expect(
      mergeFeatureRequests("source", "target", user),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
