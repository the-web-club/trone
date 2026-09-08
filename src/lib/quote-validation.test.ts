import { describe, expect, it } from "vitest";
import { parseQuoteForm } from "@/lib/quote-validation";
import { toQuoteItemInput } from "@/lib/quote-version";

function formData(payload: unknown) {
  const data = new FormData();
  data.set("payload", JSON.stringify(payload));
  return data;
}

describe("parseQuoteForm custom lines", () => {
  it("accepteert een handmatige regel zonder prijs", () => {
    const parsed = parseQuoteForm(
      formData({
        companyId: "c1",
        items: [
          {
            kind: "custom",
            title: "Montage",
            description: "Op locatie",
            unitPrice: null,
          },
        ],
      }),
    );
    expect(parsed.items).toEqual([
      {
        kind: "custom",
        title: "Montage",
        description: "Op locatie",
        unitPrice: null,
      },
    ]);
  });

  it("leest een Nederlandse prijs", () => {
    const parsed = parseQuoteForm(
      formData({
        companyId: "c1",
        items: [
          {
            kind: "custom",
            title: "Transport",
            description: "",
            unitPrice: "1.250,50",
          },
        ],
      }),
    );
    expect(parsed.items[0]).toMatchObject({
      kind: "custom",
      title: "Transport",
      unitPrice: 1250.5,
    });
  });
});

describe("toQuoteItemInput", () => {
  it("zet een handmatige snapshot terug naar formulierinput", () => {
    expect(
      toQuoteItemInput({
        productId: "",
        quantity: 1,
        unitPrice: 250,
        configSnapshot: {
          kind: "custom",
          title: "Montage",
          description: "Op locatie",
          hasPrice: true,
        },
      }),
    ).toEqual({
      kind: "custom",
      title: "Montage",
      description: "Op locatie",
      unitPrice: 250,
    });
  });

  it("laat de prijs leeg als die niet is ingevuld", () => {
    expect(
      toQuoteItemInput({
        productId: "",
        quantity: 1,
        unitPrice: 0,
        configSnapshot: {
          kind: "custom",
          title: "Toelichting",
          description: "Zes weken",
          hasPrice: false,
        },
      }),
    ).toEqual({
      kind: "custom",
      title: "Toelichting",
      description: "Zes weken",
      unitPrice: null,
    });
  });
});
