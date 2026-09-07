import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/components/quote/quote-pdf-document";
import type { QuotePdfView } from "@/lib/quote-pdf-data";

const FONT_FILES = {
  400: "InterTight-Regular.woff",
  500: "InterTight-Medium.woff",
  600: "InterTight-SemiBold.woff",
} as const;

let fontsRegistered = false;

function fontDir(): string {
  const candidates = [
    path.join(process.cwd(), "public/brand/fonts"),
    path.join(process.cwd(), "src/lib/pdf/fonts"),
  ];
  return (
    candidates.find((dir) => existsSync(path.join(dir, FONT_FILES[400]))) ??
    candidates[0]!
  );
}

function registerFonts() {
  if (fontsRegistered) return;
  const dir = fontDir();
  Font.registerHyphenationCallback((word) => [word]);
  Font.register({
    family: "Inter Tight",
    fonts: [
      { src: path.join(dir, FONT_FILES[400]), fontWeight: 400 },
      { src: path.join(dir, FONT_FILES[500]), fontWeight: 500 },
      { src: path.join(dir, FONT_FILES[600]), fontWeight: 600 },
    ],
  });
  fontsRegistered = true;
}

export async function renderQuotePdf(view: QuotePdfView): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<QuotePdfDocument view={view} />);
}
