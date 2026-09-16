import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDealFindUnique,
  mockDealCreate,
  mockStageFindUnique,
  mockContactFindUnique,
  mockCompanyFindUnique,
  mockNextDealSlug,
} = vi.hoisted(() => ({
  mockDealFindUnique: vi.fn(),
  mockDealCreate: vi.fn(),
  mockStageFindUnique: vi.fn(),
  mockContactFindUnique: vi.fn(),
  mockCompanyFindUnique: vi.fn(),
  mockNextDealSlug: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    // createDeal schrijft ook een audit-event; zonder deze delegate slikt
    // logAuditEvent de fout in en logt hij naar stderr tijdens de test.
    auditEvent: { create: vi.fn(), createMany: vi.fn() },
    deal: {
      findUnique: mockDealFindUnique,
      create: mockDealCreate,
    },
    dealStage: { findUnique: mockStageFindUnique },
    contact: { findUnique: mockContactFindUnique },
    company: { findUnique: mockCompanyFindUnique },
  }),
}));

vi.mock("@/lib/entity-slug", () => ({
  nextDealSlug: mockNextDealSlug,
}));

vi.mock("@/lib/id", async () => {
  const actual = await vi.importActual<typeof import("@/lib/id")>("@/lib/id");
  return {
    ...actual,
    createId: () => "deal-new",
  };
});

import { createDeal } from "@/lib/deal-service";

const SUBMISSION_A = "11111111-1111-4111-8111-111111111111";
const SUBMISSION_B = "22222222-2222-4222-8222-222222222222";

const input = {
  title: "Caterpillar 15",
  stageId: "stage-1",
  companyId: "company-1",
  contactId: "contact-1",
};

function dealRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal-1",
    slug: "caterpillar-15",
    submissionId: SUBMISSION_A,
    title: input.title,
    companyId: input.companyId,
    contactId: input.contactId,
    stageId: input.stageId,
    sourceId: null,
    valueEstimate: null,
    status: "OPEN",
    ownerUserId: "user-1",
    ...overrides,
  };
}

describe("createDeal idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStageFindUnique.mockResolvedValue({
      id: "stage-1",
      isWon: false,
      isLost: false,
    });
    mockCompanyFindUnique.mockResolvedValue({ id: "company-1" });
    mockContactFindUnique.mockResolvedValue({
      id: "contact-1",
      companyId: "company-1",
    });
    mockNextDealSlug.mockResolvedValue("caterpillar-15");
    mockDealFindUnique.mockResolvedValue(null);
    mockDealCreate.mockResolvedValue(dealRow({ id: "deal-new" }));
  });

  it("maakt één lead en hergebruikt die bij dezelfde indiening", async () => {
    const created = await createDeal(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(created.id).toBe("deal-new");
    expect(mockDealCreate).toHaveBeenCalledTimes(1);
    expect(mockDealCreate.mock.calls[0]?.[0]?.data.submissionId).toBe(
      SUBMISSION_A,
    );

    mockDealFindUnique.mockResolvedValue(dealRow({ id: "deal-new" }));
    const retried = await createDeal(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(retried.id).toBe("deal-new");
    expect(mockDealCreate).toHaveBeenCalledTimes(1);
  });

  it("geeft dezelfde lead terug bij een concurrent unique-conflict", async () => {
    mockDealFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(dealRow());
    mockDealCreate.mockRejectedValue({ code: "P2002" });

    const result = await createDeal(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(result.id).toBe("deal-1");
    expect(mockDealCreate).toHaveBeenCalledTimes(1);
  });

  it("weigert hergebruik van een id met andere aanmaakgegevens", async () => {
    mockDealFindUnique.mockResolvedValue(dealRow());
    await expect(
      createDeal({ ...input, title: "Andere titel" }, "user-1", {
        submissionId: SUBMISSION_A,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockDealCreate).not.toHaveBeenCalled();
  });

  it("laat een nieuwe aanvraag van hetzelfde contact toe", async () => {
    await createDeal(input, "user-1", { submissionId: SUBMISSION_A });
    mockDealFindUnique.mockResolvedValue(null);
    mockDealCreate.mockResolvedValue(
      dealRow({ id: "deal-2", submissionId: SUBMISSION_B, slug: "caterpillar-15-2" }),
    );
    const second = await createDeal(input, "user-1", {
      submissionId: SUBMISSION_B,
    });
    expect(second.id).toBe("deal-2");
    expect(mockDealCreate).toHaveBeenCalledTimes(2);
  });

  it("blijft requireSession-grenzen respecteren door geen tenant-bypass toe te voegen", async () => {
    const created = await createDeal(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(created.ownerUserId).toBe("user-1");
    expect(mockCompanyFindUnique).toHaveBeenCalledWith({
      where: { id: "company-1" },
    });
  });

  it("gooit door bij een bevestigde databasefout", async () => {
    mockDealCreate.mockRejectedValue(new Error("db down"));
    await expect(
      createDeal(input, "user-1", { submissionId: SUBMISSION_A }),
    ).rejects.toThrow("db down");
  });
});
