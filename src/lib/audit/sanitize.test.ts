import { describe, expect, it } from "vitest";
import {
  AUDIT_METADATA_LIMITS,
  AUDIT_REDACTED,
  buildAuditSearchIndex,
  isSensitiveAuditKey,
  sanitizeAuditFilters,
  sanitizeAuditHref,
  sanitizeAuditMetadata,
  sanitizeAuditRoute,
  sanitizeAuditText,
} from "@/lib/audit/sanitize";

describe("sanitizeAuditMetadata", () => {
  it("redigeert gevoelige sleutels op elk niveau", () => {
    const result = sanitizeAuditMetadata({
      password: "geheim123",
      newPassword: "ookgeheim",
      wachtwoordHerhaal: "nogmaals",
      sessionToken: "abc.def.ghi",
      authorization: "Bearer xyz",
      apiKey: "sk-live-1",
      cookie: "sid=1",
      iban: "NL12ABCD3456789012",
      genest: { secret: "x", veilig: "ja" },
    });

    expect(result).toEqual({
      password: AUDIT_REDACTED,
      newPassword: AUDIT_REDACTED,
      wachtwoordHerhaal: AUDIT_REDACTED,
      sessionToken: AUDIT_REDACTED,
      authorization: AUDIT_REDACTED,
      apiKey: AUDIT_REDACTED,
      cookie: AUDIT_REDACTED,
      iban: AUDIT_REDACTED,
      genest: { secret: AUDIT_REDACTED, veilig: "ja" },
    });
  });

  it("gooit velden met een volledige request- of formulierinhoud helemaal weg", () => {
    const result = sanitizeAuditMetadata({
      body: { naam: "Jan", telefoon: "0612345678" },
      formData: { a: 1 },
      headers: { cookie: "sid" },
      innerHTML: "<div>…</div>",
      stackTrace: "at foo (bar.js:1)",
      emailBody: "Beste Jan, …",
      behouden: "wel",
    });
    expect(result).toEqual({ behouden: "wel" });
  });

  it("kapt strings, arrays en diepte af", () => {
    const long = "a".repeat(1000);
    const result = sanitizeAuditMetadata({
      lang: long,
      lijst: Array.from({ length: 50 }, (_, index) => index),
      diep: { a: { b: { c: { d: { e: "te diep" } } } } },
    }) as Record<string, unknown>;

    expect((result.lang as string).length).toBe(
      AUDIT_METADATA_LIMITS.maxStringLength,
    );
    const list = result.lijst as unknown[];
    expect(list.length).toBe(AUDIT_METADATA_LIMITS.maxArrayLength + 1);
    expect(list[list.length - 1]).toBe("[+30 meer]");
    expect(JSON.stringify(result.diep)).toContain("te diep");
  });

  it("houdt de payload onder de bovengrens en meldt het afkappen", () => {
    const bulk: Record<string, string> = {};
    for (let index = 0; index < 30; index += 1) {
      bulk[`veld${index}`] = "x".repeat(200);
    }
    const result = sanitizeAuditMetadata(bulk);
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(
      AUDIT_METADATA_LIMITS.maxSerializedLength,
    );
    expect(result?._afgekapt).toBe(true);
  });

  it("overleeft een cyclische structuur", () => {
    const cyclisch: Record<string, unknown> = { naam: "a" };
    cyclisch.zelf = cyclisch;
    expect(sanitizeAuditMetadata(cyclisch)).toEqual({
      naam: "a",
      zelf: "[cyclisch]",
    });
  });

  it("levert null bij niets bruikbaars", () => {
    expect(sanitizeAuditMetadata(null)).toBeNull();
    expect(sanitizeAuditMetadata("tekst")).toBeNull();
    expect(sanitizeAuditMetadata([1, 2])).toBeNull();
    expect(sanitizeAuditMetadata({})).toBeNull();
    expect(sanitizeAuditMetadata({ weg: undefined })).toBeNull();
  });
});

describe("isSensitiveAuditKey", () => {
  it("matcht ongeacht schrijfwijze en samenstelling", () => {
    for (const key of [
      "Password",
      "user_password_confirm",
      "X-Api-Key",
      "SESSIONTOKEN",
      "creditCardNumber",
    ]) {
      expect(isSensitiveAuditKey(key)).toBe(true);
    }
    expect(isSensitiveAuditKey("naam")).toBe(false);
    expect(isSensitiveAuditKey("stageId")).toBe(false);
  });
});

describe("sanitizeAuditRoute", () => {
  it("houdt alleen het pad over", () => {
    expect(sanitizeAuditRoute("/leads?zoeken=jan&token=abc")).toBe("/leads");
    expect(
      sanitizeAuditRoute("https://app.trone.nl/bedrijven/acme?email=a@b.nl"),
    ).toBe("/bedrijven/acme");
    expect(sanitizeAuditRoute("/leads/#detail")).toBe("/leads");
  });

  it("normaliseert rare invoer", () => {
    expect(sanitizeAuditRoute("leads")).toBe("/leads");
    expect(sanitizeAuditRoute("//leads//nieuw//")).toBe("/leads/nieuw");
    expect(sanitizeAuditRoute("")).toBeNull();
    expect(sanitizeAuditRoute(null)).toBeNull();
  });
});

describe("sanitizeAuditHref", () => {
  it("redigeert gevoelige queryparameters maar houdt de rest leesbaar", () => {
    expect(sanitizeAuditHref("/wachtwoord-instellen?token=geheim")).toBe(
      `/wachtwoord-instellen?token=${encodeURIComponent(AUDIT_REDACTED)}`,
    );
    expect(sanitizeAuditHref("/leads?fase=stage-1")).toBe("/leads?fase=stage-1");
  });

  it("verbergt het adres achter mailto en tel", () => {
    expect(sanitizeAuditHref("mailto:jan@example.com")).toBe(
      `mailto:${AUDIT_REDACTED}`,
    );
    expect(sanitizeAuditHref("tel:+31612345678")).toBe(`tel:${AUDIT_REDACTED}`);
  });
});

describe("sanitizeAuditText", () => {
  it("verwijdert controltekens en vouwt whitespace samen", () => {
    expect(sanitizeAuditText("  Nieuwe\n\tlead \u0000aanmaken  ")).toBe(
      "Nieuwe lead aanmaken",
    );
    expect(sanitizeAuditText("   ")).toBeNull();
    expect(sanitizeAuditText(42)).toBeNull();
  });
});

describe("sanitizeAuditFilters", () => {
  it("houdt alleen toegestane sleutels en redigeert de zoekterm", () => {
    const params: Array<[string, string]> = [
      ["zoeken", "acme industrie"],
      ["fase", "stage-1"],
      ["token", "geheim"],
      ["onbekend", "x"],
    ];
    expect(
      sanitizeAuditFilters(params, ["zoeken", "fase"]),
    ).toEqual({ zoeken_lengte: "acme industrie".length, fase: "stage-1" });
  });

  it("levert null als er niets toegestaan overblijft", () => {
    expect(sanitizeAuditFilters([["token", "x"]], ["fase"])).toBeNull();
  });
});

describe("buildAuditSearchIndex", () => {
  it("maakt één lowercase zoekveld en negeert leegte", () => {
    expect(
      buildAuditSearchIndex(["lead.create", "/leads", null, "Acme BV", ""]),
    ).toBe("lead.create /leads acme bv");
    expect(buildAuditSearchIndex([null, undefined, " "])).toBeNull();
  });
});
