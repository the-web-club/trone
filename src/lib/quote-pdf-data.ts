import { countryLabel } from "@/lib/countries";
import { AppError } from "@/lib/errors";
import { formatDate, formatPersonName } from "@/lib/format";
import {
  EMPTY_LETTERHEAD,
  type Letterhead,
} from "@/lib/letterhead";
import { vatOnNet } from "@/lib/pricing";
import { isQuoteConfigSnapshot } from "@/lib/quote-catalog";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { quoteStatusLabels } from "@/lib/quote-validation";
import type { VatRegime } from "@/lib/vat";

export type QuotePdfItemSource = {
  description: string | null;
  quantity: number;
  unitPrice: { toString(): string } | number;
  lineTotal: { toString(): string } | number;
  configSnapshot: unknown;
};

export type QuotePdfSource = {
  quoteNumber: string;
  status: keyof typeof quoteStatusLabels;
  notes: string | null;
  validUntil: Date | null;
  createdAt: Date;
  currentVersionNumber: number;
  vatRate: { toString(): string } | number | null;
  vatRegime: VatRegime | null;
  vatNotice: string | null;
  subtotal: { toString(): string } | number;
  discountTotal: { toString(): string } | number;
  total: { toString(): string } | number;
  company: {
    name: string;
    vatNumber: string | null;
    cocNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country: string;
    vatRate: { toString(): string } | number;
  };
  contact: {
    firstName: string;
    lastName: string | null;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  items: QuotePdfItemSource[];
  versions: Array<{
    versionNumber: number;
    status: keyof typeof quoteStatusLabels;
    vatRate: { toString(): string } | number | null;
    vatRegime: VatRegime | null;
    vatNotice: string | null;
    subtotal: { toString(): string } | number;
    discountTotal: { toString(): string } | number;
    total: { toString(): string } | number;
    items: QuotePdfItemSource[];
  }>;
};

export type QuotePdfSelection = {
  name: string;
  value: string;
  priceDelta: number;
  priceOnRequest: boolean;
};

export type QuotePdfLine = {
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selections: QuotePdfSelection[];
  hasOnRequest: boolean;
};

export type QuotePdfView = {
  filename: string;
  documentTitle: string;
  quoteNumber: string;
  versionNumber: number;
  createdAt: string;
  validUntil: string | null;
  notes: string | null;
  customer: {
    name: string;
    addressLines: string[];
    vatNumber: string | null;
    contactName: string | null;
  };
  letterhead: Letterhead;
  items: QuotePdfLine[];
  subtotal: number;
  discountTotal: number;
  totalExVat: number;
  vatRate: number;
  vatAmount: number;
  vatLabel: string;
  totalInclVat: number;
  hasOnRequest: boolean;
};

function num(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function compactLines(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim() ?? "").filter(Boolean);
}

function customerAddressLines(company: QuotePdfSource["company"]): string[] {
  const cityLine = [company.postalCode, company.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const country = countryLabel(company.country);
  return compactLines([
    company.addressLine,
    cityLine || null,
    country && country !== cityLine ? country : null,
  ]);
}

function selectionRank(selection: QuotePdfSelection): number {
  if (selection.priceOnRequest) return 0;
  if (selection.priceDelta > 0) return 1;
  return 2;
}

export function vatPdfLabel(
  vatRate: number,
  vatRegime: VatRegime | null,
): string {
  if (vatRegime === "VERLEGD") return "Btw verlegd";
  if (vatRegime === "EXPORT") return "0% export";
  return `Btw ${vatRate}%`;
}

function toPdfLine(item: QuotePdfItemSource): QuotePdfLine {
  const snapshot = isQuoteConfigSnapshot(item.configSnapshot)
    ? item.configSnapshot
    : null;
  const selections =
    snapshot?.selections.map((selection) => ({
      name: selection.optionName,
      value: selection.value,
      priceDelta: selection.priceDelta,
      priceOnRequest: selection.priceOnRequest,
    })) ?? [];
  return {
    title: snapshot?.productName ?? item.description ?? "Product",
    quantity: item.quantity,
    unitPrice: num(item.unitPrice),
    lineTotal: num(item.lineTotal),
    selections: [...selections].sort(
      (a, b) => selectionRank(a) - selectionRank(b),
    ),
    hasOnRequest: snapshot?.price.hasOnRequest ?? false,
  };
}

export function toQuotePdfView(
  quote: QuotePdfSource,
  opts?: { versionNumber?: number; letterhead?: Letterhead },
): QuotePdfView {
  const requested = opts?.versionNumber;
  const version =
    requested != null
      ? quote.versions.find((row) => row.versionNumber === requested)
      : undefined;

  if (requested != null && !version) {
    throw new AppError("Versie niet gevonden.", "NOT_FOUND", 404);
  }

  const versionNumber = version?.versionNumber ?? quote.currentVersionNumber;
  const items = (version ? version.items : quote.items).map(toPdfLine);
  const vatRate = num(version?.vatRate ?? quote.vatRate ?? quote.company.vatRate);
  const subtotal = num(version?.subtotal ?? quote.subtotal);
  const discountTotal = num(version?.discountTotal ?? quote.discountTotal);
  const totalExVat = num(version?.total ?? quote.total);
  const { vatAmount, grossTotal } = vatOnNet(totalExVat, vatRate);
  const vatRegime = version?.vatRegime ?? quote.vatRegime;
  const versionLabel = formatQuoteVersionNumber(quote.quoteNumber, versionNumber);
  const contactName = quote.contact
    ? formatPersonName(quote.contact.firstName, quote.contact.lastName)
    : null;

  return {
    filename: `TRONE-${versionLabel}.pdf`,
    documentTitle: `Offerte ${quote.quoteNumber}`,
    quoteNumber: quote.quoteNumber,
    versionNumber,
    createdAt: formatDate(quote.createdAt),
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : null,
    notes: quote.notes?.trim() || null,
    customer: {
      name: quote.company.name,
      addressLines: customerAddressLines(quote.company),
      vatNumber: quote.company.vatNumber,
      contactName,
    },
    letterhead: opts?.letterhead ?? { ...EMPTY_LETTERHEAD },
    items,
    subtotal,
    discountTotal,
    totalExVat,
    vatRate,
    vatAmount,
    vatLabel: vatPdfLabel(vatRate, vatRegime),
    totalInclVat: grossTotal,
    hasOnRequest: items.some((item) => item.hasOnRequest),
  };
}
