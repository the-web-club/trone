// =====================================================================
// Pricing domein — pure types. Geen imports uit Prisma of Next.
// Deze module draait identiek op server en client (isomorf), zodat de
// configurator dezelfde prijs toont als de server afrekent.
// =====================================================================

/** Eén keuzemogelijkheid binnen een optie-as (bv '10-direction', 'TS95'). */
export interface OptionValue {
  id: string;
  value: string;
  priceDelta: number; // meerprijs in EUR t.o.v. basis
  priceOnRequest: boolean; // true = geen auto-prijs (bv draaitafel)
}

/** Een optie-as (bv 'armrest', 'air_suspension'). */
export interface ProductOption {
  id: string;
  code: string;
  name: string;
  inputType: "select" | "boolean";
  isRequired: boolean;
}

/** Basisproduct (ECS of LAS4.1). */
export interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number; // bruto basisprijs excl. btw
}

/**
 * Availability: welke opties/waarden bij welk product horen.
 * Leeg voor een optie = die optie is bij elk product toegestaan.
 * Aanwezig = alleen de vermelde (product, optie[, waarde]) is toegestaan.
 */
export interface OptionAvailability {
  productId: string;
  optionId: string;
  optionValueId: string | null; // null = hele optie toegestaan
}

/** De keuze die de gebruiker/verkoper maakt per optie-as. */
export interface SelectedOption {
  optionId: string;
  optionValueId: string; // altijd een waarde, ook bij boolean ('Ja')
}

/** Volledige catalogus-context die de rekenmodule nodig heeft. */
export interface PricingContext {
  products: Product[];
  options: ProductOption[];
  values: OptionValue[];
  availability: OptionAvailability[];
}

/** De configuratie waarvoor we een prijs willen. */
export interface ConfigurationInput {
  productId: string;
  selections: SelectedOption[];
  /** Klantspecifieke kortingspercentage (0..100), optioneel. */
  discountPercent?: number;
  /** BTW-tarief o.b.v. klantlocatie (0..100). Default 21. */
  vatRate?: number;
  quantity?: number; // default 1
}

/** Eén regel in de prijsopbouw, voor transparante weergave. */
export interface PriceLine {
  label: string;
  amount: number;
  onRequest: boolean;
}

/** Volledig resultaat van de berekening. */
export interface PriceResult {
  productName: string;
  basePrice: number;
  optionLines: PriceLine[];
  optionsTotal: number;
  /** basis + opties, vóór korting (per stuk). */
  unitSubtotal: number;
  discountPercent: number;
  discountAmount: number;
  /** na korting, per stuk, excl. btw. */
  unitNet: number;
  quantity: number;
  /** unitNet * quantity. */
  netTotal: number;
  vatRate: number;
  vatAmount: number;
  grossTotal: number;
  /** true als één of meer gekozen opties 'prijs op aanvraag' zijn. */
  hasOnRequest: boolean;
  /** codes van opties die op aanvraag zijn, voor een offerte-flag. */
  onRequestOptions: string[];
}

/** Validatiefout bij een ongeldige configuratie. */
export interface ConfigError {
  code:
    | "PRODUCT_NOT_FOUND"
    | "OPTION_NOT_FOUND"
    | "VALUE_NOT_FOUND"
    | "VALUE_OPTION_MISMATCH"
    | "OPTION_NOT_AVAILABLE"
    | "VALUE_NOT_AVAILABLE"
    | "REQUIRED_OPTION_MISSING"
    | "DUPLICATE_OPTION";
  message: string;
  optionCode?: string;
}
