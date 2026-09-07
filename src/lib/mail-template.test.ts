import { describe, expect, it } from "vitest";
import {
  MAIL_SENDER_EMAIL,
  MAIL_SENDER_NAME,
  brandedMail,
  invitationMail,
  mailAssetOrigin,
  mailFromAddress,
  mailLogoUrl,
} from "@/lib/mail-template";

describe("mailFromAddress", () => {
  it("gebruikt de standaard afzender", () => {
    expect(mailFromAddress()).toBe(
      `${MAIL_SENDER_NAME} <${MAIL_SENDER_EMAIL}>`,
    );
  });

  it("negeert een onbevestigd of verouderd from-adres", () => {
    expect(mailFromAddress("noreply@troneseating.nl")).toBe(
      `${MAIL_SENDER_NAME} <${MAIL_SENDER_EMAIL}>`,
    );
    expect(mailFromAddress("Support <help@example.com>")).toBe(
      `${MAIL_SENDER_NAME} <${MAIL_SENDER_EMAIL}>`,
    );
  });

  it("laat de geverifieerde updates-afzender intact", () => {
    expect(
      mailFromAddress(`Support <${MAIL_SENDER_EMAIL}>`),
    ).toBe(`Support <${MAIL_SENDER_EMAIL}>`);
    expect(mailFromAddress(MAIL_SENDER_EMAIL)).toBe(
      `${MAIL_SENDER_NAME} <${MAIL_SENDER_EMAIL}>`,
    );
  });
});

describe("mailAssetOrigin", () => {
  it("neemt MAIL_ASSET_ORIGIN boven andere bronnen", () => {
    expect(
      mailAssetOrigin({
        MAIL_ASSET_ORIGIN: "https://cdn.example.com/",
        BETTER_AUTH_URL: "https://www.troneseating.app",
      }),
    ).toBe("https://cdn.example.com");
  });

  it("negeert localhost en valt terug op productie", () => {
    expect(
      mailAssetOrigin({ BETTER_AUTH_URL: "http://localhost:3000" }),
    ).toBe("https://www.troneseating.app");
  });

  it("gebruikt de publieke app-url voor het logo", () => {
    expect(
      mailLogoUrl({ BETTER_AUTH_URL: "https://www.troneseating.app" }),
    ).toBe("https://www.troneseating.app/brand/trone-seating-logo.png");
  });
});

describe("brandedMail", () => {
  it("zet logo, tekst en knop in html en plain text", () => {
    const mail = brandedMail({
      title: "Test",
      greeting: "Hallo Anna,",
      paragraphs: ["Dit is de inhoud."],
      action: { label: "Openen", url: "https://www.troneseating.app/x" },
      logoUrl: "https://www.troneseating.app/brand/trone-seating-logo.png",
    });

    expect(mail.html).toContain("TRÔNE Seating");
    expect(mail.html).toContain(
      'src="https://www.troneseating.app/brand/trone-seating-logo.png"',
    );
    expect(mail.html).toContain("Hallo Anna,");
    expect(mail.html).toContain("https://www.troneseating.app/x");
    expect(mail.html).toContain("#35353c");
    expect(mail.html).toContain("#ed7845");
    expect(mail.text).toContain("Hallo Anna,");
    expect(mail.text).toContain("Openen: https://www.troneseating.app/x");
    expect(mail.text).toContain("TRÔNE Seating");
  });

  it("escapt html in namen", () => {
    const mail = brandedMail({
      title: "Test",
      greeting: 'Hallo <img src="x">,',
      paragraphs: ["ok"],
      logoUrl: "https://www.troneseating.app/brand/trone-seating-logo.png",
    });
    expect(mail.html).toContain("Hallo &lt;img src=&quot;x&quot;&gt;,");
    expect(mail.html).not.toContain('<img src="x">');
  });
});

describe("invitationMail", () => {
  it("gebruikt het merkformaat voor uitnodigingen", () => {
    const mail = invitationMail({
      name: "Rik",
      url: "https://www.troneseating.app/wachtwoord-instellen?token=abc",
    });
    expect(mail.subject).toBe("Je bent uitgenodigd voor TRÔNE Seating");
    expect(mail.html).toContain("Wachtwoord instellen");
    expect(mail.html).toContain("trone-seating-logo.png");
    expect(mail.text).toContain("Hallo Rik,");
    expect(mail.text).toContain(
      "https://www.troneseating.app/wachtwoord-instellen?token=abc",
    );
  });
});
