import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  parseCreateFeatureRequestForm,
  parseFeatureRequestCommentForm,
  parseFeatureRequestStatusValue,
  parseUpdateFeatureRequestInput,
  validateCreateFeatureRequestFields,
} from "@/lib/feature-request-validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("feature request validation", () => {
  it("accepts a valid create form", () => {
    expect(
      parseCreateFeatureRequestForm(
        form({
          type: "BUG",
          title: "Filter onthoudt pagina niet",
          description: "Na terug navigeren reset de lijst.",
        }),
      ),
    ).toEqual({
      type: "BUG",
      title: "Filter onthoudt pagina niet",
      description: "Na terug navigeren reset de lijst.",
    });
  });

  it("rejects a missing title and too-long title", () => {
    expect(() =>
      parseCreateFeatureRequestForm(form({ type: "FEATURE", title: "   " })),
    ).toThrow(AppError);
    expect(
      validateCreateFeatureRequestFields({
        type: "FEATURE",
        title: "x".repeat(161),
        description: "",
      }).title,
    ).toMatch(/160/);
  });

  it("treats an empty description as null", () => {
    expect(
      parseCreateFeatureRequestForm(
        form({ type: "IMPROVEMENT", title: "Snellere zoek", description: "  " }),
      ).description,
    ).toBeNull();
  });

  it("allows clearing the description on update", () => {
    expect(
      parseUpdateFeatureRequestInput({ description: "" }),
    ).toEqual({ description: null });
  });

  it("rejects setting status to merged via the status field", () => {
    expect(() => parseFeatureRequestStatusValue("MERGED")).toThrow(/samenvoegen/);
  });

  it("requires comment text", () => {
    expect(() =>
      parseFeatureRequestCommentForm(form({ requestId: "req-1", body: "   " })),
    ).toThrow(/niet leeg/);
  });
});
