import { describe, expect, it, vi } from "vitest";
import {
  createSubmissionGuard,
  createSubmissionId,
  isSubmissionId,
  LEAD_SAVE_UNCERTAIN_MESSAGE,
  parseDealSubmissionId,
  refreshAfterSuccess,
  submitLeadCreation,
  visibleDealFieldErrors,
} from "@/lib/lead-submission";
import { AppError } from "@/lib/errors";

describe("submission id", () => {
  it("maakt een geldige uuid", () => {
    expect(isSubmissionId(createSubmissionId())).toBe(true);
  });

  it("weigert een ongeldige indiening", () => {
    expect(() => parseDealSubmissionId("niet-geldig")).toThrow(AppError);
  });
});

describe("createSubmissionGuard", () => {
  it("laat maar één tegelijkertijd toe", () => {
    const guard = createSubmissionGuard();
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.tryAcquire()).toBe(false);
    guard.release();
    expect(guard.tryAcquire()).toBe(true);
  });

  it("blokkeert een nieuwe poging na succes", () => {
    const guard = createSubmissionGuard();
    expect(guard.tryAcquire()).toBe(true);
    guard.markSucceeded();
    expect(guard.tryAcquire()).toBe(false);
  });
});

describe("visibleDealFieldErrors", () => {
  it("toont geen fouten op onberoerde velden", () => {
    expect(
      visibleDealFieldErrors({ title: "Titel is verplicht" }, {}, false),
    ).toEqual({});
  });

  it("toont een fout na blur of submit", () => {
    expect(
      visibleDealFieldErrors(
        { title: "Titel is verplicht" },
        { title: true },
        false,
      ),
    ).toEqual({ title: "Titel is verplicht" });
    expect(
      visibleDealFieldErrors({ title: "Titel is verplicht" }, {}, true),
    ).toEqual({ title: "Titel is verplicht" });
  });
});

describe("submitLeadCreation", () => {
  function form() {
    const data = new FormData();
    data.set("title", "Nieuwe lead");
    data.set("submissionId", createSubmissionId());
    return data;
  }

  it("stuurt bij snelle herhaalde clicks maar één save", async () => {
    const guard = createSubmissionGuard();
    let release!: () => void;
    const hang = new Promise<{ deal: { id: string } }>((resolve) => {
      release = () => resolve({ deal: { id: "lead-1" } });
    });
    const save = vi.fn(() => hang);

    const first = submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save,
    });
    const second = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save,
    });
    const third = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save,
    });

    expect(second).toEqual({ status: "ignored" });
    expect(third).toEqual({ status: "ignored" });
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await expect(first).resolves.toEqual({
      status: "success",
      deal: { id: "lead-1" },
    });
  });

  it("maakt niets aan bij ongeldige invoer en wordt daarna weer indienbaar", async () => {
    const guard = createSubmissionGuard();
    const save = vi.fn();
    const invalid = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({
        success: false,
        fieldErrors: { title: "Titel is verplicht" },
        formError: "Titel is verplicht",
      }),
      save,
    });
    expect(invalid).toEqual({
      status: "invalid",
      fieldErrors: { title: "Titel is verplicht" },
      formError: "Titel is verplicht",
    });
    expect(save).not.toHaveBeenCalled();

    const valid = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ deal: { id: "lead-1" } }),
    });
    expect(valid).toEqual({ status: "success", deal: { id: "lead-1" } });
  });

  it("bewaart invoer bij een bevestigde fout en laat opnieuw opslaan toe", async () => {
    const guard = createSubmissionGuard();
    const failed = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ error: "Fase niet gevonden." }),
    });
    expect(failed).toEqual({ status: "failed", error: "Fase niet gevonden." });

    const retried = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ deal: { id: "lead-1" } }),
    });
    expect(retried.status).toBe("success");
  });

  it("legt een verloren antwoord uit en laat een veilige retry toe", async () => {
    const guard = createSubmissionGuard();
    const first = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => {
        throw new Error("network");
      },
    });
    expect(first).toEqual({
      status: "uncertain",
      error: LEAD_SAVE_UNCERTAIN_MESSAGE,
    });

    const retry = await submitLeadCreation({
      guard,
      formData: form(),
      validate: () => ({ success: true }),
      save: async () => ({ deal: { id: "lead-1" } }),
    });
    expect(retry).toEqual({ status: "success", deal: { id: "lead-1" } });
  });

  it("ververst de lijst opnieuw zonder opnieuw op te slaan", () => {
    const refresh = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error("refresh failed");
      })
      .mockImplementationOnce(() => undefined);
    refreshAfterSuccess(refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
