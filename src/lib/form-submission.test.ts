import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import {
  createSubmissionGuard,
  createSubmissionId,
  parseSubmissionId,
  refreshAfterSuccess,
  submitFormAction,
  UNCERTAIN_SAVE_MESSAGE,
  visibleFieldErrors,
} from "@/lib/form-submission";

describe("submitFormAction", () => {
  function form() {
    const data = new FormData();
    data.set("name", "Acme");
    data.set("submissionId", createSubmissionId());
    return data;
  }

  it("laat onafhankelijke formulieren tegelijkertijd toe", async () => {
    const first = createSubmissionGuard();
    const second = createSubmissionGuard();
    let releaseFirst!: () => void;
    const hang = new Promise<{ result: { id: string } }>((resolve) => {
      releaseFirst = () => resolve({ result: { id: "a" } });
    });

    const pending = submitFormAction({
      guard: first,
      formData: form(),
      validate: () => ({ success: true }),
      save: () => hang,
    });
    const other = await submitFormAction({
      guard: second,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ result: { id: "b" } }),
    });

    expect(other).toEqual({ status: "success", result: { id: "b" } });
    releaseFirst();
    await expect(pending).resolves.toEqual({
      status: "success",
      result: { id: "a" },
    });
  });

  it("geeft een onzekere uitkomst bij een verloren antwoord", async () => {
    const result = await submitFormAction({
      guard: createSubmissionGuard(),
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => {
        throw new Error("network");
      },
    });
    expect(result).toEqual({
      status: "uncertain",
      error: UNCERTAIN_SAVE_MESSAGE,
    });
  });

  it("laat na een bevestigde fout opnieuw indienen toe", async () => {
    const guard = createSubmissionGuard();
    const failed = await submitFormAction({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ error: "Naam is verplicht" }),
    });
    expect(failed.status).toBe("failed");

    const retried = await submitFormAction({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ result: { id: "1" } }),
    });
    expect(retried).toEqual({ status: "success", result: { id: "1" } });
  });

  it("laat een server-redirect door als bevestigd succes", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/leads",
    });
    await expect(
      submitFormAction({
        guard: createSubmissionGuard(),
        formData: form(),
        validate: () => ({ success: true }),
        save: async () => {
          throw redirect;
        },
      }),
    ).rejects.toBe(redirect);
  });
});

describe("parseSubmissionId", () => {
  it("weigert een ongeldige uuid", () => {
    expect(() => parseSubmissionId("abc")).toThrow(AppError);
  });
});

describe("visibleFieldErrors", () => {
  it("toont niets tot blur of submit", () => {
    expect(visibleFieldErrors({ name: "Naam is verplicht" }, {}, false)).toEqual(
      {},
    );
  });
});

describe("refreshAfterSuccess", () => {
  it("probeert de verversing opnieuw zonder de mutatie te herhalen", () => {
    const refresh = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("refresh failed");
      })
      .mockImplementationOnce(() => undefined);
    refreshAfterSuccess(refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
