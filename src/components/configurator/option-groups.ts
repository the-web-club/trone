import type { CatalogOption } from "@/lib/quote-catalog";

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
    id: "veiligheid",
    title: "Veiligheid",
    codes: ["belt", "seat_switch"],
  },
  {
    id: "extra",
    title: "Montage en extra’s",
    codes: ["air_suspension", "turntable", "converter", "mount_bracket"],
  },
];

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
