import { describe, expect, it } from "vitest";
import {
  isRichTextEmpty,
  normalizeRichText,
  richTextPlain,
  richTextToHtml,
  sanitizeRichText,
} from "@/lib/rich-text";

describe("sanitizeRichText", () => {
  it("houdt vet, cursief, doorhalen en bullets", () => {
    expect(
      sanitizeRichText("<b>vet</b> <i>cursief</i> <s>weg</s><ul><li>punt</li></ul>"),
    ).toBe("<b>vet</b> <i>cursief</i> <s>weg</s><ul><li>punt</li></ul>");
  });

  it("stript scripts en attributen", () => {
    expect(sanitizeRichText('<b onclick="alert(1)">Hi</b>')).toBe("<b>Hi</b>");
    expect(sanitizeRichText("<script>alert(1)</script>Hallo")).toBe("Hallo");
    expect(sanitizeRichText('<img src=x onerror="alert(1)">')).toBe("");
  });

  it("zet styled spans om naar semantische tags", () => {
    expect(
      sanitizeRichText('<span style="font-weight:bold">vet</span>'),
    ).toBe("<b>vet</b>");
    expect(
      sanitizeRichText('<span style="font-style:italic;text-decoration:line-through">x</span>'),
    ).toBe("<i><s>x</s></i>");
  });

  it("converteert genummerde lijsten naar bullets", () => {
    expect(sanitizeRichText("<ol><li>een</li></ol>")).toBe("<ul><li>een</li></ul>");
  });

  it("escaped losse < in platte tekst", () => {
    expect(sanitizeRichText("5 < 10")).toBe("5 &lt; 10");
  });
});

describe("normalizeRichText", () => {
  it("laat bestaande platte notities ongemoeid", () => {
    expect(normalizeRichText("Gebeld")).toBe("Gebeld");
    expect(normalizeRichText("  Gebeld  ")).toBe("Gebeld");
  });

  it("behandelt lege editor-html als leeg", () => {
    expect(normalizeRichText("<p><br></p>")).toBeUndefined();
    expect(normalizeRichText("<ul><li><br></li></ul>")).toBeUndefined();
    expect(normalizeRichText("   ")).toBeUndefined();
  });

  it("bewaart opgemaakte inhoud", () => {
    expect(normalizeRichText("<b>Hallo</b>")).toBe("<b>Hallo</b>");
  });
});

describe("richTextToHtml", () => {
  it("zet regeleinden in oude notities om naar br", () => {
    expect(richTextToHtml("regel 1\nregel 2")).toBe("regel 1<br>regel 2");
  });
});

describe("isRichTextEmpty / richTextPlain", () => {
  it("leest bullets als platte tekst", () => {
    expect(richTextPlain("<ul><li>een</li><li>twee</li></ul>")).toBe("een\ntwee");
    expect(isRichTextEmpty("<div><br></div>")).toBe(true);
  });
});
