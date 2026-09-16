import { AppError } from "@/lib/errors";

/** URL/filter: geen bedrijf gekoppeld (alleen leads). */
export const CLASSIFICATION_FILTER_NO_COMPANY = "geen-bedrijf" as const;
/** URL/filter: waarde ontbreekt. Geen fictieve branche in de database. */
export const CLASSIFICATION_FILTER_UNKNOWN = "onbekend" as const;

export const CLASSIFICATION_FILTER_TOKENS = [
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
] as const;

export type ClassificationFilterToken =
  (typeof CLASSIFICATION_FILTER_TOKENS)[number];

export type ClassificationOption = {
  code: string;
  label: string;
};

export type IndustryDefinition = ClassificationOption & {
  sectors: readonly ClassificationOption[];
};

const OVERIG_SECTOR: ClassificationOption = {
  code: "overig",
  label: "Overig",
};

function withOverig(
  sectors: readonly ClassificationOption[],
): readonly ClassificationOption[] {
  return [...sectors, OVERIG_SECTOR];
}

export const INDUSTRIES = [
  {
    code: "transport_logistiek",
    label: "Transport & logistiek",
    sectors: withOverig([
      { code: "wegtransport", label: "Wegtransport" },
      { code: "warehousing_opslag", label: "Warehousing & opslag" },
      {
        code: "logistieke_dienstverlening",
        label: "Logistieke dienstverlening",
      },
      { code: "pakket_koeriersdiensten", label: "Pakket- & koeriersdiensten" },
    ]),
  },
  {
    code: "industrie_productie",
    label: "Industrie & productie",
    sectors: withOverig([
      { code: "voedingsmiddelen_dranken", label: "Voedingsmiddelen & dranken" },
      { code: "metaal_staal", label: "Metaal & staal" },
      { code: "chemie", label: "Chemie" },
      { code: "kunststof", label: "Kunststof" },
      { code: "hout_papier", label: "Hout & papier" },
      { code: "bouwmaterialen", label: "Bouwmaterialen" },
      { code: "machinebouw", label: "Machinebouw" },
    ]),
  },
  {
    code: "handel_distributie",
    label: "Handel & distributie",
    sectors: withOverig([
      { code: "foodgroothandel", label: "Foodgroothandel" },
      { code: "technische_groothandel", label: "Technische groothandel" },
      { code: "bouwmaterialenhandel", label: "Bouwmaterialenhandel" },
      { code: "overige_groothandel", label: "Overige groothandel" },
      { code: "retail", label: "Retail" },
    ]),
  },
  {
    code: "bouw_infra_grondverzet",
    label: "Bouw, infra & grondverzet",
    sectors: withOverig([
      { code: "bouwbedrijven", label: "Bouwbedrijven" },
      { code: "grondverzet", label: "Grondverzet" },
      { code: "wegenbouw", label: "Wegenbouw" },
      { code: "civiele_techniek", label: "Civiele techniek" },
      { code: "sloopbedrijven", label: "Sloopbedrijven" },
      { code: "hijs_kraanbedrijven", label: "Hijs- & kraanbedrijven" },
    ]),
  },
  {
    code: "landbouw_tuinbouw_bosbouw",
    label: "Landbouw, tuinbouw & bosbouw",
    sectors: withOverig([
      { code: "akkerbouw", label: "Akkerbouw" },
      { code: "veehouderij", label: "Veehouderij" },
      { code: "tuinbouw", label: "Tuinbouw" },
      { code: "agrarisch_loonwerk", label: "Agrarisch loonwerk" },
      { code: "bosbouw", label: "Bosbouw" },
    ]),
  },
  {
    code: "havens_scheepvaart_offshore",
    label: "Havens, scheepvaart & offshore",
    sectors: withOverig([
      { code: "havenoverslag_terminals", label: "Havenoverslag & terminals" },
      { code: "binnenvaart", label: "Binnenvaart" },
      { code: "zeevaart", label: "Zeevaart" },
      { code: "baggerbedrijven", label: "Baggerbedrijven" },
      { code: "offshore", label: "Offshore" },
    ]),
  },
  {
    code: "afval_recycling",
    label: "Afval & recycling",
    sectors: withOverig([
      { code: "afvalinzameling", label: "Afvalinzameling" },
      { code: "afvalverwerking", label: "Afvalverwerking" },
      { code: "metaalrecycling", label: "Metaalrecycling" },
      { code: "bouw_slooprecycling", label: "Bouw- & slooprecycling" },
      { code: "overige_recycling", label: "Overige recycling" },
    ]),
  },
  {
    code: "delfstoffenwinning",
    label: "Delfstoffenwinning",
    sectors: withOverig([
      { code: "zand_grindwinning", label: "Zand- & grindwinning" },
      { code: "steengroeven", label: "Steengroeven" },
      { code: "mijnbouw", label: "Mijnbouw" },
    ]),
  },
  {
    code: "personenvervoer",
    label: "Personenvervoer",
    sectors: withOverig([
      { code: "busvervoer", label: "Busvervoer" },
      { code: "touringcars", label: "Touringcars" },
      { code: "taxi_zorgvervoer", label: "Taxi- & zorgvervoer" },
      { code: "spoorvervoer", label: "Spoorvervoer" },
    ]),
  },
  {
    code: "energie_nutsbedrijven",
    label: "Energie & nutsbedrijven",
    sectors: withOverig([
      { code: "energieproductie", label: "Energieproductie" },
      { code: "olie_gas", label: "Olie & gas" },
      { code: "netbeheer", label: "Netbeheer" },
      { code: "drinkwater_afvalwater", label: "Drinkwater & afvalwater" },
    ]),
  },
  {
    code: "overheid_veiligheid",
    label: "Overheid & veiligheid",
    sectors: withOverig([
      {
        code: "gemeenten_uitvoeringsdiensten",
        label: "Gemeenten & uitvoeringsdiensten",
      },
      { code: "defensie", label: "Defensie" },
      { code: "hulpdiensten", label: "Hulpdiensten" },
      { code: "beveiligingsdiensten", label: "Beveiligingsdiensten" },
    ]),
  },
  {
    code: "overig",
    label: "Overig",
    sectors: [OVERIG_SECTOR],
  },
] as const satisfies readonly IndustryDefinition[];

export type IndustryCode = (typeof INDUSTRIES)[number]["code"];

export const APPLICATIONS = [
  { code: "heftruck_intern_transport", label: "Heftruck & intern transport" },
  { code: "graafmachine_minigraver", label: "Graafmachine & minigraver" },
  { code: "wiellader_shovel", label: "Wiellader / shovel" },
  { code: "kraan", label: "Kraan" },
  {
    code: "overige_bouw_grondverzet",
    label: "Overige bouw- & grondverzetmachines",
  },
  { code: "landbouw_bosbouwmachines", label: "Landbouw- & bosbouwmachines" },
  { code: "vrachtwagen", label: "Vrachtwagen" },
  { code: "bestelwagen_camper", label: "Bestelwagen & camper" },
  { code: "bus_touringcar_spoor", label: "Bus, touringcar & spoorvoertuig" },
  {
    code: "vaartuig_offshore",
    label: "Vaartuig & offshore-installatie",
  },
  {
    code: "controlekamer_24_7",
    label: "Controlekamer & 24/7-operatorwerkplek",
  },
  { code: "kantoorwerkplek", label: "Kantoorwerkplek" },
  { code: "overige_toepassing", label: "Overige toepassing" },
] as const satisfies readonly ClassificationOption[];

export type ApplicationCode = (typeof APPLICATIONS)[number]["code"];

export const RELATION_TYPES = [
  { code: "eindgebruiker", label: "Eindgebruiker" },
  { code: "dealer_wederverkoper", label: "Dealer/wederverkoper" },
  { code: "oem_fabrikant", label: "OEM/fabrikant" },
  { code: "verhuurder", label: "Verhuurder" },
  { code: "service_montagepartner", label: "Service-/montagepartner" },
  { code: "adviseur", label: "Adviseur" },
] as const satisfies readonly ClassificationOption[];

export type RelationTypeCode = (typeof RELATION_TYPES)[number]["code"];

const INDUSTRY_BY_CODE = new Map<string, (typeof INDUSTRIES)[number]>(
  INDUSTRIES.map((industry) => [industry.code, industry]),
);
const APPLICATION_BY_CODE = new Map<string, (typeof APPLICATIONS)[number]>(
  APPLICATIONS.map((item) => [item.code, item]),
);
const RELATION_TYPE_BY_CODE = new Map<string, (typeof RELATION_TYPES)[number]>(
  RELATION_TYPES.map((item) => [item.code, item]),
);
const SECTOR_CODES = new Set<string>(
  INDUSTRIES.flatMap((industry) => industry.sectors.map((sector) => sector.code)),
);

export function isIndustryCode(value: string): value is IndustryCode {
  return INDUSTRY_BY_CODE.has(value);
}

export function isSectorCode(value: string): boolean {
  return SECTOR_CODES.has(value);
}

export function isApplicationCode(value: string): value is ApplicationCode {
  return APPLICATION_BY_CODE.has(value);
}

export function isRelationTypeCode(value: string): value is RelationTypeCode {
  return RELATION_TYPE_BY_CODE.has(value);
}

export function getIndustry(code: string | null | undefined) {
  if (!code) return null;
  return INDUSTRY_BY_CODE.get(code) ?? null;
}

export function getIndustryLabel(code: string | null | undefined): string | null {
  return getIndustry(code)?.label ?? null;
}

export function getSectorsForIndustry(industryCode: string | null | undefined) {
  return getIndustry(industryCode)?.sectors ?? [];
}

export function sectorBelongsToIndustry(
  industryCode: string | null | undefined,
  sectorCode: string | null | undefined,
): boolean {
  if (!industryCode || !sectorCode) return false;
  return getSectorsForIndustry(industryCode).some(
    (sector) => sector.code === sectorCode,
  );
}

export function getSectorLabel(
  industryCode: string | null | undefined,
  sectorCode: string | null | undefined,
): string | null {
  if (!sectorCode) return null;
  if (industryCode) {
    return (
      getSectorsForIndustry(industryCode).find(
        (sector) => sector.code === sectorCode,
      )?.label ?? null
    );
  }
  for (const industry of INDUSTRIES) {
    const match = industry.sectors.find((sector) => sector.code === sectorCode);
    if (match) return match.label;
  }
  return null;
}

export function getApplicationLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return APPLICATION_BY_CODE.get(code)?.label ?? null;
}

export function getRelationTypeLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return RELATION_TYPE_BY_CODE.get(code)?.label ?? null;
}

export function industrySelectOptions(includeEmpty = true): ClassificationOption[] {
  const items = INDUSTRIES.map((industry) => ({
    code: industry.code,
    label: industry.label,
  }));
  return includeEmpty
    ? [{ code: "", label: "Onbekend" }, ...items]
    : items;
}

export function sectorSelectOptions(
  industryCode: string | null | undefined,
  includeEmpty = true,
): ClassificationOption[] {
  const items = getSectorsForIndustry(industryCode).map((sector) => ({
    code: sector.code,
    label: sector.label,
  }));
  return includeEmpty
    ? [{ code: "", label: "Onbekend" }, ...items]
    : items;
}

export function applicationSelectOptions(): ClassificationOption[] {
  return APPLICATIONS.map((item) => ({ code: item.code, label: item.label }));
}

export function relationTypeSelectOptions(): ClassificationOption[] {
  return RELATION_TYPES.map((item) => ({ code: item.code, label: item.label }));
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() || "";
  return trimmed ? trimmed : null;
}

export type IndustrySectorInput = {
  industryCode: string | null;
  sectorCode: string | null;
};

export type IndustrySectorPrevious = {
  industryCode?: string | null;
  sectorCode?: string | null;
};

/**
 * Lege waarden blijven leeg (onbekend). Ongeldige codes worden geweigerd.
 * Bij een branchewijziging wordt een niet langer geldige sector in dezelfde
 * opslagactie verwijderd. Een expliciet ongeldig paar zonder branchewijziging
 * wordt geweigerd.
 */
export function normalizeIndustrySector(
  input: IndustrySectorInput,
  previous?: IndustrySectorPrevious,
): IndustrySectorInput {
  const industryCode = emptyToNull(input.industryCode);
  const sectorCode = emptyToNull(input.sectorCode);

  if (industryCode && !isIndustryCode(industryCode)) {
    throw new AppError("Ongeldige hoofdbranche.", "VALIDATION");
  }
  if (sectorCode && !isSectorCode(sectorCode)) {
    throw new AppError("Ongeldige sector.", "VALIDATION");
  }
  if (sectorCode && !industryCode) {
    throw new AppError("Kies eerst een hoofdbranche.", "VALIDATION");
  }
  if (industryCode && sectorCode && !sectorBelongsToIndustry(industryCode, sectorCode)) {
    const previousIndustry = emptyToNull(previous?.industryCode);
    const previousSector = emptyToNull(previous?.sectorCode);
    const industryChanged = previousIndustry !== industryCode;
    const sectorUnchanged = previousSector === sectorCode;
    if (industryChanged && sectorUnchanged) {
      return { industryCode, sectorCode: null };
    }
    throw new AppError(
      "Deze sector hoort niet bij de gekozen hoofdbranche.",
      "VALIDATION",
    );
  }

  return { industryCode, sectorCode };
}

export function parseRelationTypeCodes(values: Iterable<string> | null | undefined) {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    const code = raw.trim();
    if (!code || seen.has(code)) continue;
    if (!isRelationTypeCode(code)) {
      throw new AppError("Ongeldig relatietype.", "VALIDATION");
    }
    seen.add(code);
    unique.push(code);
  }
  return unique;
}

export function parseApplicationCodes(values: Iterable<string> | null | undefined) {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of values ?? []) {
    const code = raw.trim();
    if (!code || seen.has(code)) continue;
    if (!isApplicationCode(code)) {
      throw new AppError("Ongeldige toepassing.", "VALIDATION");
    }
    seen.add(code);
    unique.push(code);
  }
  return unique;
}

export function uniqueApplicationCodes(
  deals: Array<{ applications?: Array<{ code: string }> | string[] | null }>,
): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const deal of deals) {
    const list = deal.applications ?? [];
    for (const item of list) {
      const code = typeof item === "string" ? item : item.code;
      if (!isApplicationCode(code) || seen.has(code)) continue;
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

export function formatApplicationLabels(codes: readonly string[]): string {
  return codes
    .map((code) => getApplicationLabel(code))
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

export function formatRelationTypeLabels(codes: readonly string[]): string {
  return codes
    .map((code) => getRelationTypeLabel(code))
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

export function formatIndustrySector(
  industryCode: string | null | undefined,
  sectorCode: string | null | undefined,
): string | null {
  const industry = getIndustryLabel(industryCode);
  if (!industry) return null;
  const sector = getSectorLabel(industryCode, sectorCode);
  return sector ? `${industry} · ${sector}` : industry;
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function parseClassificationParamValues(
  values: Array<string | null | undefined> | string | null | undefined,
): string[] {
  const raw = Array.isArray(values) ? values : values ? [values] : [];
  const parts = raw.flatMap((value) =>
    String(value)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return uniquePreserveOrder(parts);
}

export function parseIndustryFilterValues(values: string[]): string[] {
  return values.filter(
    (value) =>
      isIndustryCode(value) ||
      value === CLASSIFICATION_FILTER_NO_COMPANY ||
      value === CLASSIFICATION_FILTER_UNKNOWN,
  );
}

export function parseSectorFilterValues(values: string[]): string[] {
  return values.filter(
    (value) => isSectorCode(value) || value === CLASSIFICATION_FILTER_UNKNOWN,
  );
}

export function parseApplicationFilterValues(values: string[]): string[] {
  return values.filter(
    (value) =>
      isApplicationCode(value) || value === CLASSIFICATION_FILTER_UNKNOWN,
  );
}

export function industryFilterLabel(code: string): string {
  if (code === CLASSIFICATION_FILTER_NO_COMPANY) return "Geen bedrijf gekoppeld";
  if (code === CLASSIFICATION_FILTER_UNKNOWN) return "Hoofdbranche onbekend";
  return getIndustryLabel(code) ?? code;
}

export function sectorFilterLabel(code: string): string {
  if (code === CLASSIFICATION_FILTER_UNKNOWN) return "Sector onbekend";
  return getSectorLabel(undefined, code) ?? code;
}

export function applicationFilterLabel(code: string): string {
  if (code === CLASSIFICATION_FILTER_UNKNOWN) return "Toepassing onbekend";
  return getApplicationLabel(code) ?? code;
}

export type ClassificationListFilter = {
  industries: string[];
  sectors: string[];
  applications: string[];
};

export function hasClassificationListFilter(
  filter: ClassificationListFilter,
): boolean {
  return (
    filter.industries.length > 0 ||
    filter.sectors.length > 0 ||
    filter.applications.length > 0
  );
}

export function joinClassificationParam(values: readonly string[]): string {
  return uniquePreserveOrder([...values]).join(",");
}

/** Eenduidige legacy-labels voor herhaalbare migratie; geen gissingen. */
const LEGACY_INDUSTRY_LABELS = new Map(
  INDUSTRIES.map((industry) => [industry.label.toLowerCase(), industry.code]),
);
const LEGACY_APPLICATION_LABELS = new Map(
  APPLICATIONS.map((item) => [item.label.toLowerCase(), item.code]),
);
const LEGACY_SECTOR_LABELS = new Map<string, { industryCode: string; sectorCode: string }>();
for (const industry of INDUSTRIES) {
  for (const sector of industry.sectors) {
    const key = sector.label.toLowerCase();
    if (sector.code === "overig") {
      LEGACY_SECTOR_LABELS.set(`${industry.label.toLowerCase()} · overig`, {
        industryCode: industry.code,
        sectorCode: sector.code,
      });
      continue;
    }
    if (!LEGACY_SECTOR_LABELS.has(key)) {
      LEGACY_SECTOR_LABELS.set(key, {
        industryCode: industry.code,
        sectorCode: sector.code,
      });
    }
  }
}

export function migrateIndustryLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  return LEGACY_INDUSTRY_LABELS.get(trimmed) ?? null;
}

export function migrateSectorLabel(
  value: string | null | undefined,
  industryCode?: string | null,
): { industryCode: string; sectorCode: string } | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  if (industryCode && trimmed === "overig" && isIndustryCode(industryCode)) {
    return { industryCode, sectorCode: "overig" };
  }
  const match = LEGACY_SECTOR_LABELS.get(trimmed);
  if (!match) return null;
  if (industryCode && match.industryCode !== industryCode) return null;
  return match;
}

export function migrateApplicationLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  return LEGACY_APPLICATION_LABELS.get(trimmed) ?? null;
}
