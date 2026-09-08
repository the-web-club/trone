import { describe, expect, it } from "vitest";
import { EMPTY_LETTERHEAD } from "@/lib/letterhead";
import {
  toQuotePdfView,
  vatPdfLabel,
  type QuotePdfSource,
} from "@/lib/quote-pdf-data";

function quote(overrides: Partial<QuotePdfSource> = {}): QuotePdfSource {
  return {
    quoteNumber: "OFF202600012",
    status: "SENT",
    notes: "  Levertijd 6 weken  ",
    validUntil: new Date("2026-10-01T00:00:00.000Z"),
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    currentVersionNumber: 2,
    vatRate: 21,
    vatRegime: "BINNENLANDS",
    vatNotice: null,
    subtotal: 3000,
    discountTotal: 100,
    total: 2900,
    company: {
      name: "Acme BV",
      vatNumber: "NL123456789B01",
      addressLine: "Kade 1",
      postalCode: "1234 AB",
      city: "Utrecht",
      country: "NL",
      vatRate: 21,
    },
    contact: {
      firstName: "Anna",
      lastName: "de Vries",
      jobTitle: "Inkoper",
      email: "anna@acme.test",
      phone: "06 12345678",
    },
    items: [
      {
        description: "Oude naam",
        quantity: 2,
        unitPrice: 1450,
        lineTotal: 2900,
        configSnapshot: {
          productId: "p1",
          productSku: "ECS",
          productName: "ECS High Back",
          selections: [
            {
              optionId: "o1",
              optionCode: "fabric",
              optionName: "Stof",
              optionValueId: "v1",
              value: "Zwart",
              priceDelta: 0,
              priceOnRequest: false,
            },
            {
              optionId: "o3",
              optionCode: "armrest",
              optionName: "Armleuningen",
              optionValueId: "v3",
              value: "10-direction",
              priceDelta: 540,
              priceOnRequest: false,
            },
            {
              optionId: "o2",
              optionCode: "turntable",
              optionName: "Draaitafel",
              optionValueId: "v2",
              value: "Ja",
              priceDelta: 0,
              priceOnRequest: true,
            },
          ],
          price: {
            productName: "ECS High Back",
            basePrice: 2555,
            optionLines: [],
            optionsTotal: 0,
            unitSubtotal: 2555,
            discountPercent: 0,
            discountAmount: 0,
            unitNet: 1450,
            quantity: 2,
            netTotal: 2900,
            vatRate: 21,
            vatAmount: 609,
            grossTotal: 3509,
            hasOnRequest: true,
            onRequestOptions: ["turntable"],
          },
          computedAt: "2026-09-01T00:00:00.000Z",
        },
      },
    ],
    versions: [
      {
        versionNumber: 1,
        status: "SENT",
        vatRate: 21,
        vatRegime: "BINNENLANDS",
        vatNotice: null,
        subtotal: 2555,
        discountTotal: 0,
        total: 2555,
        items: [
          {
            description: "ECS",
            quantity: 1,
            unitPrice: 2555,
            lineTotal: 2555,
            configSnapshot: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("vatPdfLabel", () => {
  it("houdt binnenlands bij het percentage", () => {
    expect(vatPdfLabel(21, "BINNENLANDS")).toBe("Btw 21%");
    expect(vatPdfLabel(21, null)).toBe("Btw 21%");
  });

  it("benoemt verlegd en export kort", () => {
    expect(vatPdfLabel(0, "VERLEGD")).toBe("Btw verlegd");
    expect(vatPdfLabel(0, "EXPORT")).toBe("0% export");
  });
});

describe("toQuotePdfView", () => {
  it("zet de huidige versie om zonder verzonnen briefpapier", () => {
    const view = toQuotePdfView(quote());
    expect(view.filename).toBe("TRONE-OFF202600012-v2.pdf");
    expect(view.quoteNumber).toBe("OFF202600012");
    expect(view.customer.name).toBe("Acme BV");
    expect(view.customer.addressLines).toEqual([
      "Kade 1",
      "1234 AB Utrecht",
      "Nederland",
    ]);
    expect(view.customer.contactName).toBe("Anna de Vries");
    expect(view.letterhead).toEqual(EMPTY_LETTERHEAD);
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.title).toBe("ECS High Back");
    expect(view.items[0]?.selections.map((row) => row.name)).toEqual([
      "Draaitafel",
      "Armleuningen",
      "Stof",
    ]);
    expect(view.hasOnRequest).toBe(true);
    expect(view.totalExVat).toBe(2900);
    expect(view.vatAmount).toBe(609);
    expect(view.totalInclVat).toBe(3509);
    expect(view.vatLabel).toBe("Btw 21%");
    expect(view.notes).toBe("Levertijd 6 weken");
  });

  it("neemt ingevulde bedrijfsgegevens over", () => {
    const view = toQuotePdfView(quote(), {
      letterhead: {
        ...EMPTY_LETTERHEAD,
        name: "Voorbeeld BV",
        cocNumber: "123",
        iban: "NL00TEST",
      },
    });
    expect(view.letterhead.name).toBe("Voorbeeld BV");
    expect(view.letterhead.cocNumber).toBe("123");
    expect(view.letterhead.iban).toBe("NL00TEST");
  });

  it("kan een eerdere versie als bron nemen", () => {
    const view = toQuotePdfView(quote(), { versionNumber: 1 });
    expect(view.filename).toBe("TRONE-OFF202600012-v1.pdf");
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.title).toBe("ECS");
    expect(view.totalExVat).toBe(2555);
    expect(view.totalInclVat).toBe(3091.55);
  });

  it("zet een handmatige regel als titel plus niet-vette omschrijving", () => {
    const view = toQuotePdfView(
      quote({
        items: [
          {
            description: "Montage",
            quantity: 1,
            unitPrice: 250,
            lineTotal: 250,
            configSnapshot: {
              kind: "custom",
              title: "Montage op locatie",
              description: "Inclusief afvoer van de oude stoelen.",
              hasPrice: true,
            },
          },
          {
            description: "Toelichting",
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
            configSnapshot: {
              kind: "custom",
              title: "Levertijd",
              description: "Circa zes weken na akkoord.",
              hasPrice: false,
            },
          },
        ],
      }),
    );
    expect(view.items).toHaveLength(2);
    expect(view.items[0]).toMatchObject({
      title: "Montage op locatie",
      body: "Inclusief afvoer van de oude stoelen.",
      hasPrice: true,
      lineTotal: 250,
    });
    expect(view.items[1]).toMatchObject({
      title: "Levertijd",
      body: "Circa zes weken na akkoord.",
      hasPrice: false,
    });
  });
});
