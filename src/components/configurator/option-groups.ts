import {
  valuesForProductOption,
  type CatalogOption,
  type CatalogValue,
  type QuoteCatalog,
} from "@/lib/quote-catalog";

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

/** Opties waar de UI geen synthetische of catalogus-"Geen" toont. */
export const HIDE_NONE_OPTION_CODES = ["width"] as const;

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

export function displayOptionValues(
  option: CatalogOption,
  values: CatalogValue[],
): CatalogValue[] {
  if (!(HIDE_NONE_OPTION_CODES as readonly string[]).includes(option.code)) {
    return values;
  }
  return values.filter((value) => value.value !== "Geen");
}

export function showNoneChoice(option: CatalogOption): boolean {
  return (
    !option.isRequired &&
    !(HIDE_NONE_OPTION_CODES as readonly string[]).includes(option.code)
  );
}

/** Zet Breedte op Standaard als er nog geen keuze is. */
export function ensurePreferredSelections(
  catalog: QuoteCatalog,
  productId: string,
  selections: { optionId: string; optionValueId: string }[],
): { optionId: string; optionValueId: string }[] {
  const width = catalog.options.find((option) => option.code === "width");
  if (!width) return selections;
  if (selections.some((selection) => selection.optionId === width.id)) {
    return selections;
  }
  const values = displayOptionValues(
    width,
    valuesForProductOption(catalog, productId, width),
  );
  const standaard =
    values.find((value) => value.value === "Standaard") ?? values[0];
  if (!standaard) return selections;
  return [...selections, { optionId: width.id, optionValueId: standaard.id }];
}
