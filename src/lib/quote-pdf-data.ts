import { countryLabel } from "@/lib/countries";
import { AppError } from "@/lib/errors";
import { formatDate, formatPersonName } from "@/lib/format";
import { vatOnNet } from "@/lib/pricing";
import { isQuoteConfigSnapshot } from "@/lib/quote-catalog";
import { formatQuoteVersionNumber } from "@/lib/quote-version";
import { quoteStatusLabels } from "@/lib/quote-validation";
import { SELLER } from "@/lib/seller";
import { VAT_REGIME_LABELS, type VatRegime } from "@/lib/vat";

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

export type QuotePdfLine = {
  title: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selections: { name: string; value: string; priceDelta: number; priceOnRequest: boolean }[];
  hasOnRequest: boolean;
};

export type QuotePdfView = {
  filename: string;
  documentTitle: string;
  quoteNumber: string;
  versionNumber: number;
  versionLabel: string;
  statusLabel: string;
  createdAt: string;
  validUntil: string | null;
  notes: string | null;
  customer: {
    name: string;
    addressLines: string[];
    vatNumber: string | null;
    contactName: string | null;
    contactMeta: string | null;
  };
  seller: typeof SELLER;
  items: QuotePdfLine[];
  subtotal: number;
  discountTotal: number;
  totalExVat: number;
  vatRate: number;
  vatAmount: number;
  vatRegimeLabel: string | null;
  vatNotice: string | null;
  totalInclVat: number;
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

function toPdfLine(item: QuotePdfItemSource): QuotePdfLine {
  const snapshot = isQuoteConfigSnapshot(item.configSnapshot)
    ? item.configSnapshot
    : null;
  return {
    title: snapshot?.productName ?? item.description ?? "Product",
    sku: snapshot?.productSku ?? null,
    quantity: item.quantity,
    unitPrice: num(item.unitPrice),
    lineTotal: num(item.lineTotal),
    selections:
      snapshot?.selections.map((selection) => ({
        name: selection.optionName,
        value: selection.value,
        priceDelta: selection.priceDelta,
        priceOnRequest: selection.priceOnRequest,
      })) ?? [],
    hasOnRequest: snapshot?.price.hasOnRequest ?? false,
  };
}

export function toQuotePdfView(
  quote: QuotePdfSource,
  opts?: { versionNumber?: number },
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
  const contactMeta = quote.contact
    ? compactLines([
        quote.contact.jobTitle,
        quote.contact.email,
        quote.contact.phone,
      ]).join(" · ") || null
    : null;

  return {
    filename: `TRONE-${versionLabel}.pdf`,
    documentTitle: `Offerte ${versionLabel}`,
    quoteNumber: quote.quoteNumber,
    versionNumber,
    versionLabel,
    statusLabel: quoteStatusLabels[version?.status ?? quote.status],
    createdAt: formatDate(quote.createdAt),
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : null,
    notes: quote.notes?.trim() || null,
    customer: {
      name: quote.company.name,
      addressLines: customerAddressLines(quote.company),
      vatNumber: quote.company.vatNumber,
      contactName,
      contactMeta,
    },
    seller: SELLER,
    items,
    subtotal,
    discountTotal,
    totalExVat,
    vatRate,
    vatAmount,
    vatRegimeLabel: vatRegime ? VAT_REGIME_LABELS[vatRegime] : null,
    vatNotice: version?.vatNotice ?? quote.vatNotice,
    totalInclVat: grossTotal,
  };
}
