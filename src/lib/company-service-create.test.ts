import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCompanyFindUnique, mockCompanyCreate, mockNextCompanySlug } =
  vi.hoisted(() => ({
    mockCompanyFindUnique: vi.fn(),
    mockCompanyCreate: vi.fn(),
    mockNextCompanySlug: vi.fn(),
  }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getPrismaClient: () => ({
    company: {
      findUnique: mockCompanyFindUnique,
      create: mockCompanyCreate,
    },
  }),
}));

vi.mock("@/lib/entity-slug", () => ({
  nextCompanySlug: mockNextCompanySlug,
}));

vi.mock("@/lib/id", async () => {
  const actual = await vi.importActual<typeof import("@/lib/id")>("@/lib/id");
  return {
    ...actual,
    createId: () => "company-new",
  };
});

import { createCompany } from "@/lib/company-service";

const SUBMISSION_A = "11111111-1111-4111-8111-111111111111";
const SUBMISSION_B = "22222222-2222-4222-8222-222222222222";

const input = {
  name: "Acme",
  country: "NL",
  vatRate: 21,
};

function companyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "company-1",
    slug: "acme",
    submissionId: SUBMISSION_A,
    name: input.name,
    email: null,
    phone: null,
    country: input.country,
    ownerUserId: "user-1",
    ...overrides,
  };
}

describe("createCompany idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNextCompanySlug.mockResolvedValue("acme");
    mockCompanyFindUnique.mockResolvedValue(null);
    mockCompanyCreate.mockResolvedValue(companyRow({ id: "company-new" }));
  });

  it("maakt één bedrijf en hergebruikt die bij dezelfde indiening", async () => {
    const created = await createCompany(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(created.id).toBe("company-new");
    expect(mockCompanyCreate).toHaveBeenCalledTimes(1);

    mockCompanyFindUnique.mockResolvedValue(companyRow({ id: "company-new" }));
    const retried = await createCompany(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(retried.id).toBe("company-new");
    expect(mockCompanyCreate).toHaveBeenCalledTimes(1);
  });

  it("geeft het origineel terug bij een concurrent unique-conflict", async () => {
    mockCompanyFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(companyRow());
    mockCompanyCreate.mockRejectedValue({ code: "P2002" });

    const result = await createCompany(input, "user-1", {
      submissionId: SUBMISSION_A,
    });
    expect(result.id).toBe("company-1");
  });

  it("weigert hergebruik van een id met andere aanmaakgegevens", async () => {
    mockCompanyFindUnique.mockResolvedValue(companyRow());
    await expect(
      createCompany({ ...input, name: "Ander" }, "user-1", {
        submissionId: SUBMISSION_A,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockCompanyCreate).not.toHaveBeenCalled();
  });

  it("laat een volgende, aparte indiening toe", async () => {
    await createCompany(input, "user-1", { submissionId: SUBMISSION_A });
    mockCompanyFindUnique.mockResolvedValue(null);
    mockCompanyCreate.mockResolvedValue(
      companyRow({ id: "company-2", submissionId: SUBMISSION_B }),
    );
    const second = await createCompany(input, "user-1", {
      submissionId: SUBMISSION_B,
    });
    expect(second.id).toBe("company-2");
    expect(mockCompanyCreate).toHaveBeenCalledTimes(2);
  });
});
