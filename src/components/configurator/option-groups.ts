import {
  optionsForProduct,
  valuesForProductOption,
  type CatalogOption,
  type CatalogValue,
  type QuoteCatalog,
} from "@/lib/quote-catalog";

/** Zelfde kolommen als beeld + opties, zodat de prijsbalk de beeldbreedte volgt. */
export const configuratorSplitClass =
  "flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,28rem)] lg:items-start lg:gap-10";

export type OptionSection = {
  id: string;
  title: string;
  options: CatalogOption[];
};

const SECTION_DEFS: { id: string; title: string; codes: string[] }[] = [
  {
    id: "uitvoering",
    title: "Uitvoering",
    codes: ["control", "back_height", "width", "line"],
  },
  {
    id: "bekleding",
    title: "Bekleding",
    codes: ["fabric", "headrest", "stitching", "logo_neck"],
  },
  {
    id: "comfort",
    title: "Comfort",
    codes: [
      "armrest",
      "climate",
      "seatlift",
      "tilt_adjust",
      "side_adjust",
      "side_cushion",
    ],
  },
  {
    id: "techniek",
    title: "Veiligheid & techniek",
    codes: [
      "belt",
      "seat_switch",
      "air_suspension",
      "turntable",
      "converter",
      "mount_bracket",
    ],
  },
];

/** Optionele select-opties die altijd een zichtbare default houden. */
const PREFERRED_DEFAULTS: { code: string; value: string }[] = [
  { code: "width", value: "Standaard" },
  { code: "headrest", value: "Met hoofdsteun" },
];

export function isNoneCatalogValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "geen" || normalized === "none";
}

export function hiddenNoneValue(
  option: CatalogOption,
): CatalogValue | undefined {
  return option.values.find((value) => isNoneCatalogValue(value.value));
}

export function groupOptions(options: CatalogOption[]): OptionSection[] {
  const used = new Set<string>();
  const sections: OptionSection[] = [];

  for (const def of SECTION_DEFS) {
    const matched = options.filter((option) => def.codes.includes(option.code));
    if (matched.length === 0) continue;
    matched.forEach((option) => used.add(option.id));
    sections.push({ id: def.id, title: def.title, options: matched });
  }

  const rest = options.filter((option) => !used.has(option.id));
  if (rest.length > 0) {
    sections.push({ id: "overige", title: "Overige", options: rest });
  }

  return sections;
}

/** Verbergt catalogus-"Geen"/lege waarden; die blijven intern bestaan. */
export function displayOptionValues(
  _option: CatalogOption,
  values: CatalogValue[],
): CatalogValue[] {
  return values.filter((value) => !isNoneCatalogValue(value.value));
}

export function visualSelectionId(
  option: CatalogOption,
  selectedId: string,
): string {
  const none = hiddenNoneValue(option);
  if (none && selectedId === none.id) return "";
  return selectedId;
}

export function internalSelectionId(
  option: CatalogOption,
  selectedId: string,
): string {
  if (selectedId) return selectedId;
  return hiddenNoneValue(option)?.id ?? "";
}

export function hasPreferredDefault(option: CatalogOption): boolean {
  return PREFERRED_DEFAULTS.some((row) => row.code === option.code);
}

export function canClearOptionalChoice(option: CatalogOption): boolean {
  return (
    !option.isRequired &&
    option.inputType === "select" &&
    !hasPreferredDefault(option)
  );
}

/** Zet Breedte/Hoofdsteun op hun default, en optionele "Geen" intern. */
export function ensurePreferredSelections(
  catalog: QuoteCatalog,
  productId: string,
  selections: { optionId: string; optionValueId: string }[],
): { optionId: string; optionValueId: string }[] {
  const available = optionsForProduct(catalog, productId);
  const chosen = new Set(selections.map((selection) => selection.optionId));
  const next = [...selections];

  for (const option of available) {
    if (chosen.has(option.id)) continue;

    const preferred = PREFERRED_DEFAULTS.find((row) => row.code === option.code);
    if (preferred) {
      const values = displayOptionValues(
        option,
        valuesForProductOption(catalog, productId, option),
      );
      const match =
        values.find((value) => value.value === preferred.value) ?? values[0];
      if (!match) continue;
      next.push({ optionId: option.id, optionValueId: match.id });
      chosen.add(option.id);
      continue;
    }

    if (option.isRequired || option.inputType !== "select") continue;
    const none = hiddenNoneValue(option);
    if (!none) continue;
    next.push({ optionId: option.id, optionValueId: none.id });
    chosen.add(option.id);
  }

  return next;
}
