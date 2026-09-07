import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/id";
import {
  allocateUniqueSlug,
  personSlugSource,
  RESERVED_SLUGS,
  slugify,
} from "@/lib/slug";
import {
  companyPath,
  contactPath,
  dealPath,
  newQuotePath,
  orderPath,
  quoteEditPath,
  quotePath,
} from "@/lib/paths";

describe("slugify", () => {
  it("turns names into lowercase hyphenated slugs", () => {
    expect(slugify("Thomas Kolling")).toBe("thomas-kolling");
    expect(slugify("Kölling & Zonen B.V.")).toBe("kolling-zonen-b-v");
  });

  it("falls back when nothing remains", () => {
    expect(slugify("***", "bedrijf")).toBe("bedrijf");
  });
});

describe("allocateUniqueSlug", () => {
  it("keeps the first free slug and suffixes collisions", async () => {
    const taken = new Set(["acme"]);
    const first = await allocateUniqueSlug(
      async (slug) => taken.has(slug),
      "Acme",
      "bedrijf",
    );
    expect(first).toBe("acme-2");
    taken.add(first);
    const second = await allocateUniqueSlug(
      async (slug) => taken.has(slug),
      "Acme",
      "bedrijf",
    );
    expect(second).toBe("acme-3");
  });

  it("avoids reserved path segments", async () => {
    expect(RESERVED_SLUGS.has("nieuw")).toBe(true);
    const slug = await allocateUniqueSlug(
      async () => false,
      "Nieuw",
      "bedrijf",
    );
    expect(slug).toBe("nieuw-1");
  });
});

describe("personSlugSource", () => {
  it("joins first and last name", () => {
    expect(personSlugSource("Rik", "TheWebClub")).toBe("Rik TheWebClub");
    expect(personSlugSource("Anna")).toBe("Anna");
  });
});

describe("public paths", () => {
  it("builds clean detail urls", () => {
    expect(companyPath({ slug: "thomas-kolling" })).toBe(
      "/bedrijven/thomas-kolling",
    );
    expect(contactPath({ slug: "rik-thewebclub" })).toBe(
      "/contacten/rik-thewebclub",
    );
    expect(dealPath({ slug: "voor-15-caterpillars" })).toBe(
      "/leads/voor-15-caterpillars",
    );
    expect(quotePath({ quoteNumber: "OFF202600001" })).toBe(
      "/offertes/OFF202600001",
    );
    expect(quoteEditPath({ quoteNumber: "OFF202600001" })).toBe(
      "/offertes/OFF202600001/bewerken",
    );
    expect(orderPath({ orderNumber: "2026-00001" })).toBe("/orders/2026-00001");
    expect(
      newQuotePath({
        company: { slug: "acme" },
        deal: { slug: "heftruck" },
      }),
    ).toBe("/offertes/nieuw?company=acme&deal=heftruck");
  });
});

describe("isUuid", () => {
  it("recognizes uuids and rejects public keys", () => {
    expect(isUuid("5984aa41-8f8e-4534-865a-aaff77ba885f")).toBe(true);
    expect(isUuid("thomas-kolling")).toBe(false);
    expect(isUuid("OFF202600001")).toBe(false);
    expect(isUuid("2026-00001")).toBe(false);
  });
});
