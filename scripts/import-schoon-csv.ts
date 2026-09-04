import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Prisma } from "@/generated/prisma/client";
import { normalizeDateOnlyInput, startOfCalendarDate } from "@/lib/date-input";
import { getPrismaClient } from "@/lib/db";
import { createId } from "@/lib/id";

type Tx = Prisma.TransactionClient;

// =====================================================================
// Eenmalige, idempotente import van bedrijven_schoon.csv + leads_schoon.csv.
// Upsert op sourceKlantcode / aanvraagId. Geen deletes. Bestaande records
// zonder deze sleutels blijven onaangeroerd.
// Keuzes: titel = product + " — " + company_name; message/interest → NOTE;
// contact_name → Contact; leeg land → NL, apart gelogd.
// Draaien: pnpm import:schoon-csv
// Preview: pnpm import:schoon-csv -- --dry-run
// =====================================================================

const DEFAULT_BEDRIJVEN =
  "C:\\Users\\Frederik Derks\\Downloads\\bedrijven_schoon.csv";
const DEFAULT_LEADS = "C:\\Users\\Frederik Derks\\Downloads\\leads_schoon.csv";

const LEAD_STAGE_NAME = "Lead";
const LEAD_SOURCE_NAME = "Contactformulier";
const IMPORT_NOTE_PREFIX = "Geïmporteerde aanvraag";
const TITLE_MAX = 191;
const TX_TIMEOUT_MS = 180_000;

let prismaClient: ReturnType<typeof getPrismaClient> | undefined;

function prisma() {
  if (!prismaClient) prismaClient = getPrismaClient();
  return prismaClient;
}

type CsvRow = {
  line: number;
  values: Record<string, string>;
};

type RowError = {
  line: number;
  message: string;
};

type UnrecognizedCountry = {
  line: number;
  sourceKlantcode: string;
  name: string;
  rawCountry: string;
};

type FileStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: RowError[];
  warnings: RowError[];
  linked: number;
  notes: number;
};

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function blankToEmptyMarkNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || trimmed === "-") return null;
  return trimmed;
}

function parseCsv(text: string): CsvRow[] {
  const source = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  const startLines: number[] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordStart = 1;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "" && records.length > 0) {
      row = [];
      return;
    }
    records.push(row);
    startLines.push(recordStart);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (inQuotes) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      if (c === "\n") line++;
      field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      pushField();
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      pushField();
      pushRow();
      line++;
      recordStart = line;
      continue;
    }
    field += c;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (records.length === 0) return [];
  const headers = records[0].map((h) => h.trim());
  return records.slice(1).map((cols, idx) => {
    const values: Record<string, string> = {};
    headers.forEach((header, i) => {
      values[header] = cols[i] ?? "";
    });
    return { line: startLines[idx + 1] ?? idx + 2, values };
  });
}

function splitPersonName(full: string): { firstName: string; lastName: string | null } {
  const trimmed = full.trim().replace(/\s+/g, " ");
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: null };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}

function normalizePersonName(firstName: string, lastName: string | null): string {
  return `${firstName} ${lastName ?? ""}`.trim().replace(/\s+/g, " ").toLowerCase();
}

function recognizeCountry(raw: string | null): { country: string; recognized: boolean } {
  if (!raw) return { country: "NL", recognized: false };
  const code = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return { country: code, recognized: true };
  return { country: "NL", recognized: false };
}

function dealTitle(product: string, companyName: string | null): string {
  const title = companyName ? `${product} — ${companyName}` : product;
  if (title.length <= TITLE_MAX) return title;
  return `${title.slice(0, TITLE_MAX - 1)}…`;
}

function importNoteBody(interest: string | null, message: string | null): string | null {
  const parts: string[] = [IMPORT_NOTE_PREFIX];
  if (interest) {
    parts.push("", "Interesse", interest);
  }
  if (message) {
    parts.push("", "Bericht", message);
  }
  if (!interest && !message) return null;
  return parts.join("\n");
}

function emptyStats(): FileStats {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    linked: 0,
    notes: 0,
  };
}

function printStats(label: string, stats: FileStats, extras?: { linked?: boolean; notes?: boolean }) {
  console.log(`\n=== ${label} ===`);
  console.log(`aangemaakt:  ${stats.created}`);
  console.log(`bijgewerkt:  ${stats.updated}`);
  console.log(`overgeslagen: ${stats.skipped}`);
  if (extras?.linked) {
    console.log(`gekoppeld aan bedrijf: ${stats.linked}`);
  }
  if (extras?.notes) {
    console.log(`NOTE (interest/message): ${stats.notes}`);
  }
  console.log(`fouten:      ${stats.errors.length}`);
  for (const error of stats.errors) {
    console.log(`  regel ${error.line}: ${error.message}`);
  }
  if (stats.warnings.length > 0) {
    console.log(`waarschuwingen: ${stats.warnings.length}`);
    for (const warning of stats.warnings) {
      console.log(`  regel ${warning.line}: ${warning.message}`);
    }
  }
}

async function upsertCompanyContact(
  tx: Tx,
  companyId: string,
  contactName: string,
) {
  const { firstName, lastName } = splitPersonName(contactName);
  if (!firstName) return;
  const needle = normalizePersonName(firstName, lastName);
  const existing = await tx.contact.findMany({
    where: { companyId },
    select: { id: true, firstName: true, lastName: true },
  });
  const match = existing.find(
    (contact) => normalizePersonName(contact.firstName, contact.lastName) === needle,
  );
  if (match) {
    await tx.contact.update({
      where: { id: match.id },
      data: { firstName, lastName },
    });
    return;
  }
  await tx.contact.create({
    data: {
      id: createId(),
      companyId,
      firstName,
      lastName,
      isPrimary: existing.length === 0,
    },
  });
}

async function upsertDealContact(
  tx: Tx,
  input: {
    contactId: string | null;
    companyId: string | null;
    contactName: string;
    email: string | null;
    phone: string | null;
  },
): Promise<string> {
  const { firstName, lastName } = splitPersonName(input.contactName);
  const data = {
    firstName,
    lastName,
    email: input.email,
    phone: input.phone,
    companyId: input.companyId,
  };
  if (input.contactId) {
    const current = await tx.contact.findUnique({
      where: { id: input.contactId },
      select: { id: true },
    });
    if (current) {
      await tx.contact.update({ where: { id: current.id }, data });
      return current.id;
    }
  }
  const created = await tx.contact.create({
    data: { id: createId(), ...data },
  });
  return created.id;
}

async function upsertImportNote(
  tx: Tx,
  dealId: string,
  body: string | null,
  occurredAt: Date,
) {
  if (!body) return;
  const existing = await tx.dealActivity.findFirst({
    where: {
      dealId,
      type: "NOTE",
      body: { startsWith: IMPORT_NOTE_PREFIX },
    },
    select: { id: true },
  });
  if (existing) {
    await tx.dealActivity.update({
      where: { id: existing.id },
      data: { body, occurredAt },
    });
    return;
  }
  await tx.dealActivity.create({
    data: {
      id: createId(),
      dealId,
      type: "NOTE",
      body,
      occurredAt,
    },
  });
}

function planCompanyRow(
  row: CsvRow,
  stats: FileStats,
  unrecognized: UnrecognizedCountry[],
): {
  sourceKlantcode: string;
  name: string;
  country: string;
  contactName: string | null;
} | null {
  const sourceKlantcode = blankToNull(row.values.source_klantcode);
  const name = blankToNull(row.values.name);
  if (!sourceKlantcode) {
    stats.skipped += 1;
    stats.errors.push({ line: row.line, message: "source_klantcode ontbreekt" });
    return null;
  }
  if (!name) {
    stats.skipped += 1;
    stats.errors.push({ line: row.line, message: "name ontbreekt" });
    return null;
  }

  const rawCountry = blankToNull(row.values.country);
  const { country, recognized } = recognizeCountry(rawCountry);
  if (!recognized) {
    unrecognized.push({
      line: row.line,
      sourceKlantcode,
      name,
      rawCountry: rawCountry ?? "",
    });
  }

  return {
    sourceKlantcode,
    name,
    country,
    contactName: blankToNull(row.values.contact_name),
  };
}

async function importCompanies(
  filePath: string,
  dryRun: boolean,
): Promise<{
  stats: FileStats;
  unrecognized: UnrecognizedCountry[];
  codes: Set<string>;
}> {
  const rows = parseCsv(readFileSync(filePath, "utf8"));
  const stats = emptyStats();
  const unrecognized: UnrecognizedCountry[] = [];
  const codes = new Set<string>();

  const processRows = async (tx: Tx | null) => {
    for (const row of rows) {
      const planned = planCompanyRow(row, stats, unrecognized);
      if (!planned) continue;
      codes.add(planned.sourceKlantcode);

      if (dryRun || !tx) {
        stats.created += 1;
        continue;
      }

      const data = {
        name: planned.name,
        cocNumber: blankToNull(row.values.coc_number),
        phone: blankToNull(row.values.phone),
        postalCode: blankToNull(row.values.postal_code),
        city: blankToNull(row.values.city),
        country: planned.country,
      };

      try {
        const existing = await tx.company.findUnique({
          where: { sourceKlantcode: planned.sourceKlantcode },
          select: { id: true },
        });
        const company = existing
          ? await tx.company.update({
              where: { id: existing.id },
              data,
            })
          : await tx.company.create({
              data: {
                id: createId(),
                sourceKlantcode: planned.sourceKlantcode,
                ...data,
              },
            });
        if (existing) stats.updated += 1;
        else stats.created += 1;

        if (planned.contactName) {
          await upsertCompanyContact(tx, company.id, planned.contactName);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "onbekende fout";
        throw new Error(`regel ${row.line}: ${message}`);
      }
    }
  };

  if (dryRun) {
    await processRows(null);
  } else {
    await prisma().$transaction((tx) => processRows(tx), { timeout: TX_TIMEOUT_MS });
  }

  return { stats, unrecognized, codes };
}

function planLeadRow(
  row: CsvRow,
  stats: FileStats,
  companyCodes: Set<string>,
): {
  aanvraagId: string;
  product: string;
  contactName: string;
  createdAt: Date;
  matchedCode: string | null;
  title: string;
  noteBody: string | null;
} | null {
  const aanvraagId = blankToNull(row.values.aanvraag_id);
  const product = blankToNull(row.values.product);
  const contactName = blankToNull(row.values.contact_name);
  const createdRaw = blankToNull(row.values.created_at);
  const createdAtKey = createdRaw ? normalizeDateOnlyInput(createdRaw) : null;

  if (!aanvraagId) {
    stats.skipped += 1;
    stats.errors.push({ line: row.line, message: "aanvraag_id ontbreekt" });
    return null;
  }
  if (!product) {
    stats.skipped += 1;
    stats.errors.push({ line: row.line, message: "product ontbreekt" });
    return null;
  }
  if (!contactName) {
    stats.skipped += 1;
    stats.errors.push({ line: row.line, message: "contact_name ontbreekt" });
    return null;
  }
  if (!createdAtKey) {
    stats.skipped += 1;
    stats.errors.push({
      line: row.line,
      message: `ongeldige created_at "${row.values.created_at ?? ""}"`,
    });
    return null;
  }

  const matchedCode = blankToNull(row.values.matched_klantcode);
  if (matchedCode) {
    if (companyCodes.has(matchedCode)) {
      stats.linked += 1;
    } else {
      stats.warnings.push({
        line: row.line,
        message: `matched_klantcode ${matchedCode} niet gevonden; lead zonder bedrijf geïmporteerd`,
      });
    }
  }

  const noteBody = importNoteBody(
    blankToEmptyMarkNull(row.values.interest),
    blankToEmptyMarkNull(row.values.message),
  );
  if (noteBody) stats.notes += 1;

  return {
    aanvraagId,
    product,
    contactName,
    createdAt: startOfCalendarDate(createdAtKey),
    matchedCode,
    title: dealTitle(product, blankToNull(row.values.company_name)),
    noteBody,
  };
}

async function importLeads(
  filePath: string,
  companyCodes: Set<string>,
  dryRun: boolean,
): Promise<FileStats> {
  const rows = parseCsv(readFileSync(filePath, "utf8"));
  const stats = emptyStats();

  const processRows = async (
    tx: Tx | null,
    stageId: string,
    sourceId: string,
  ) => {
    for (const row of rows) {
      const planned = planLeadRow(row, stats, companyCodes);
      if (!planned) continue;

      if (dryRun || !tx) {
        stats.created += 1;
        continue;
      }

      let companyId: string | null = null;
      if (planned.matchedCode) {
        const company = await tx.company.findUnique({
          where: { sourceKlantcode: planned.matchedCode },
          select: { id: true },
        });
        if (company) companyId = company.id;
      }

      try {
        const existing = await tx.deal.findUnique({
          where: { aanvraagId: planned.aanvraagId },
          select: { id: true, contactId: true, companyId: true },
        });

        const nextCompanyId = companyId ?? existing?.companyId ?? null;
        const contactId = await upsertDealContact(tx, {
          contactId: existing?.contactId ?? null,
          companyId: nextCompanyId,
          contactName: planned.contactName,
          email: blankToNull(row.values.email),
          phone: blankToNull(row.values.phone),
        });

        if (existing) {
          await tx.deal.update({
            where: { id: existing.id },
            data: {
              title: planned.title,
              createdAt: planned.createdAt,
              companyId: nextCompanyId,
              contactId,
            },
          });
          await upsertImportNote(tx, existing.id, planned.noteBody, planned.createdAt);
          stats.updated += 1;
        } else {
          const created = await tx.deal.create({
            data: {
              id: createId(),
              aanvraagId: planned.aanvraagId,
              title: planned.title,
              companyId: nextCompanyId,
              contactId,
              stageId,
              sourceId,
              status: "OPEN",
              createdAt: planned.createdAt,
            },
          });
          await upsertImportNote(tx, created.id, planned.noteBody, planned.createdAt);
          stats.created += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "onbekende fout";
        throw new Error(`regel ${row.line}: ${message}`);
      }
    }
  };

  if (dryRun) {
    await processRows(null, "", "");
    return stats;
  }

  const stage = await prisma().dealStage.findUnique({ where: { name: LEAD_STAGE_NAME } });
  const source = await prisma().leadSource.findUnique({ where: { name: LEAD_SOURCE_NAME } });
  if (!stage) {
    throw new Error(`Deal-stage "${LEAD_STAGE_NAME}" ontbreekt. Draai eerst pnpm seed.`);
  }
  if (!source) {
    throw new Error(`Leadbron "${LEAD_SOURCE_NAME}" ontbreekt. Draai eerst pnpm seed.`);
  }

  await prisma().$transaction(
    (tx) => processRows(tx, stage.id, source.id),
    { timeout: TX_TIMEOUT_MS },
  );

  return stats;
}

function parseCli() {
  const rest = process.argv.slice(2).filter(Boolean);
  const dryRun = rest.includes("--dry-run");
  const files = rest.filter((arg) => arg !== "--dry-run");
  return {
    dryRun,
    bedrijven: resolve(files[0] ?? DEFAULT_BEDRIJVEN),
    leads: resolve(files[1] ?? DEFAULT_LEADS),
  };
}

function printUnrecognized(unrecognized: UnrecognizedCountry[]) {
  console.log(
    `\nZonder herkend land (default NL, btw 21% bij nieuw record): ${unrecognized.length}`,
  );
  for (const row of unrecognized) {
    const raw = row.rawCountry === "" ? "(leeg)" : row.rawCountry;
    console.log(
      `  regel ${row.line}: ${row.sourceKlantcode} ${row.name} — land in CSV: ${raw}`,
    );
  }
}

async function main() {
  const { dryRun, bedrijven, leads } = parseCli();
  if (dryRun) {
    console.log("DRY-RUN — alleen CSV, geen database, niets geschreven.");
  }
  console.log("Bedrijven:", bedrijven);
  console.log("Leads:    ", leads);

  const { stats: companyStats, unrecognized, codes } = await importCompanies(
    bedrijven,
    dryRun,
  );
  printStats("Bedrijven", companyStats);
  printUnrecognized(unrecognized);

  const leadStats = await importLeads(leads, codes, dryRun);
  printStats("Leads", leadStats, { linked: true, notes: true });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
