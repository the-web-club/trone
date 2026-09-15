import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { createWithSubmissionId } from "@/lib/idempotent-create";

const SUBMISSION_A = "11111111-1111-4111-8111-111111111111";

describe("createWithSubmissionId", () => {
  it("geeft een bestaand record terug bij dezelfde indiening", async () => {
    const existing = { id: "1", name: "Acme" };
    const create = vi.fn();
    const result = await createWithSubmissionId({
      submissionId: SUBMISSION_A,
      findExisting: async () => existing,
      matches: (row) => row.name === "Acme",
      create,
    });
    expect(result).toBe(existing);
    expect(create).not.toHaveBeenCalled();
  });

  it("weigert hergebruik met andere gegevens", async () => {
    await expect(
      createWithSubmissionId({
        submissionId: SUBMISSION_A,
        findExisting: async () => ({ id: "1", name: "Acme" }),
        matches: (row) => row.name === "Beta",
        create: async () => ({ id: "2", name: "Beta" }),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("lost een concurrent unique-conflict op tot het origineel", async () => {
    const existing = { id: "1", name: "Acme" };
    const findExisting = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    const result = await createWithSubmissionId<{ id: string; name: string }>({
      submissionId: SUBMISSION_A,
      findExisting,
      matches: (row) => row.name === "Acme",
      create: async () => {
        throw { code: "P2002" };
      },
    });
    expect(result).toBe(existing);
  });

  it("laat een nieuwe indiening gewoon aanmaken", async () => {
    const created = { id: "2", name: "Acme" };
    const result = await createWithSubmissionId({
      submissionId: "22222222-2222-4222-8222-222222222222",
      findExisting: async () => null,
      matches: () => true,
      create: async () => created,
    });
    expect(result).toBe(created);
  });

  it("gooit door bij een bevestigde fout", async () => {
    await expect(
      createWithSubmissionId({
        submissionId: SUBMISSION_A,
        findExisting: async () => null,
        matches: () => true,
        create: async () => {
          throw new Error("db down");
        },
      }),
    ).rejects.toThrow("db down");
  });

  it("weigert een ongeldige indiening", async () => {
    await expect(
      createWithSubmissionId({
        submissionId: "niet-geldig",
        findExisting: async () => null,
        matches: () => true,
        create: async () => ({ id: "1" }),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
