/**
 * Builds the isolated benchmark schema (trone_perf_bench) by replaying the
 * committed migration SQL against an empty database, then seeds a large
 * representative dataset.
 *
 * Never points at the real CRM database: it refuses to run unless the target
 * database name contains "bench".
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import mariadb from "mariadb";
import { randomUUID } from "node:crypto";

const DB = process.env.DATABASE_NAME;
if (!DB || !DB.includes("bench")) {
  throw new Error(
    `Refusing to run: DATABASE_NAME must contain "bench" (got ${DB ?? "unset"}).`,
  );
}

const LEADS = Number(process.env.BENCH_LEADS ?? 12000);
const COMPANIES = Number(process.env.BENCH_COMPANIES ?? 5000);
const CONTACTS = Number(process.env.BENCH_CONTACTS ?? 14000);

const conn = await mariadb.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: DB,
  ssl: true,
  multipleStatements: true,
});

function splitStatements(sql) {
  // Strip line comments, then split on semicolons at end of line.
  const cleaned = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function applyMigrations() {
  const dir = join(process.cwd(), "prisma", "migrations");
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of names) {
    const sql = readFileSync(join(dir, name, "migration.sql"), "utf8");
    for (const statement of splitStatements(sql)) {
      try {
        await conn.query(statement);
      } catch (error) {
        // Idempotency: tolerate already-applied DDL so the script can rerun.
        const code = error.code ?? "";
        const tolerable = [
          "ER_TABLE_EXISTS_ERROR",
          "ER_DUP_FIELDNAME",
          "ER_DUP_KEYNAME",
          "ER_DUP_ENTRY",
          "ER_CANT_DROP_FIELD_OR_KEY",
          "ER_MULTIPLE_PRI_KEY",
          "ER_FK_DUP_NAME",
        ];
        if (!tolerable.includes(code)) {
          throw new Error(`${name}: ${error.message}\n--- SQL ---\n${statement.slice(0, 400)}`);
        }
      }
    }
    console.log(`applied ${name}`);
  }
}

const pick = (arr, i) => arr[i % arr.length];

const INDUSTRIES = [
  "horeca",
  "zorg",
  "onderwijs",
  "kantoor",
  "retail",
  "overheid",
  "cultuur",
  "sport",
];
const SECTORS = [
  "restaurant",
  "hotel",
  "cafe",
  "ziekenhuis",
  "verpleeghuis",
  "basisschool",
  "hogeschool",
  "coworking",
];
const APPLICATIONS = [
  "terras",
  "restaurant",
  "kantine",
  "wachtruimte",
  "vergaderzaal",
  "auditorium",
  "lounge",
];
const CITIES = [
  "Amsterdam",
  "Rotterdam",
  "Utrecht",
  "Den Haag",
  "Eindhoven",
  "Groningen",
  "Tilburg",
  "Almere",
  "Breda",
  "Nijmegen",
];
const COUNTRIES = ["NL", "BE", "DE", "FR"];
const FIRST = ["Jan", "Piet", "Marie", "Sanne", "Tom", "Lisa", "Ahmed", "Fatima", "Koen", "Eva"];
const LAST = ["Jansen", "de Vries", "Bakker", "Visser", "Smit", "Meijer", "Mulder", "Bos", "Vos", "Peters"];
const STAGES = [
  ["stage-nieuw", "Nieuw", 0, 0, 0],
  ["stage-contact", "Contact", 1, 0, 0],
  ["stage-offerte", "Offerte", 2, 0, 0],
  ["stage-won", "Gewonnen", 3, 1, 0],
  ["stage-lost", "Verloren", 4, 0, 1],
];
const SOURCES = [
  ["src-web", "Website"],
  ["src-beurs", "Beurs"],
  ["src-referral", "Referral"],
  ["src-ads", "Advertenties"],
];

async function seed() {
  console.log("seeding…");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of [
    "deal_application",
    "deal",
    "contact",
    "company",
    "deal_stage",
    "lead_source",
    "user",
  ]) {
    await conn.query(`DELETE FROM \`${table}\``);
  }

  const users = Array.from({ length: 8 }, (_, i) => ({
    id: `bench-user-${i}`,
    name: `${pick(FIRST, i)} ${pick(LAST, i)}`,
    email: `bench${i}@trone.test`,
  }));
  await conn.batch(
    "INSERT INTO `user` (id, name, email, emailVerified, createdAt, updatedAt, slug, role) VALUES (?, ?, ?, 1, NOW(), NOW(), ?, 'user')",
    users.map((u, i) => [u.id, u.name, u.email, `bench-user-${i}`]),
  );

  await conn.batch(
    "INSERT INTO deal_stage (id, name, sortOrder, isWon, isLost) VALUES (?, ?, ?, ?, ?)",
    STAGES,
  );
  await conn.batch("INSERT INTO lead_source (id, name) VALUES (?, ?)", SOURCES);

  // Companies
  const companyIds = [];
  const companyRows = [];
  for (let i = 0; i < COMPANIES; i += 1) {
    const id = `bench-company-${i}`;
    companyIds.push(id);
    // ~8% without industry, ~18% with industry but no sector
    const hasIndustry = i % 12 !== 0;
    const hasSector = hasIndustry && i % 6 !== 0;
    companyRows.push([
      id,
      `bench-company-${i}`,
      `${pick(["Van", "De", "Het", "Koninklijke", "Groep"], i)} ${pick(LAST, i)} ${pick(["BV", "Holding", "Groep", "Seating", "Interieur"], i >> 2)} ${i}`,
      i % 9 === 0 ? null : pick(CITIES, i),
      pick(COUNTRIES, i >> 3),
      i % 5 === 0 ? null : pick(users, i).id,
      hasIndustry ? pick(INDUSTRIES, i) : null,
      hasSector ? pick(SECTORS, i) : null,
    ]);
  }
  for (let i = 0; i < companyRows.length; i += 1000) {
    await conn.batch(
      "INSERT INTO company (id, slug, name, city, country, ownerUserId, industryCode, sectorCode, vatRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 21.00, NOW(), NOW())",
      companyRows.slice(i, i + 1000),
    );
  }
  console.log(`  companies: ${companyRows.length}`);

  // Contacts
  const contactIds = [];
  const contactRows = [];
  for (let i = 0; i < CONTACTS; i += 1) {
    const id = `bench-contact-${i}`;
    contactIds.push(id);
    contactRows.push([
      id,
      `bench-contact-${i}`,
      // ~7% without company
      i % 14 === 0 ? null : pick(companyIds, i),
      pick(FIRST, i),
      pick(LAST, i >> 1),
      `contact${i}@example.test`,
      `+31 6 ${String(10000000 + i).slice(0, 8)}`,
      i % 6 === 0 ? null : pick(users, i).id,
    ]);
  }
  for (let i = 0; i < contactRows.length; i += 1000) {
    await conn.batch(
      "INSERT INTO contact (id, slug, companyId, firstName, lastName, email, phone, ownerUserId, isPrimary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())",
      contactRows.slice(i, i + 1000),
    );
  }
  console.log(`  contacts: ${contactRows.length}`);

  // Deals
  const dealRows = [];
  const appRows = [];
  const now = Date.now();
  for (let i = 0; i < LEADS; i += 1) {
    const id = `bench-deal-${i}`;
    const stage = pick(STAGES, i);
    const status = stage[3] ? "WON" : stage[4] ? "LOST" : "OPEN";
    // Deliberately cluster many rows on identical createdAt to test stable sort.
    const createdAt = new Date(now - Math.floor(i / 50) * 3600_000);
    const assessed = i % 7;
    dealRows.push([
      id,
      `bench-deal-${i}`,
      `${pick(["Terras", "Kantine", "Lounge", "Auditorium", "Restaurant"], i)} ${pick(LAST, i >> 2)} ${i}`,
      // ~10% leads without company (must stay findable)
      i % 10 === 0 ? null : pick(companyIds, i),
      i % 8 === 0 ? null : pick(contactIds, i),
      stage[0],
      i % 11 === 0 ? null : pick(SOURCES, i)[0],
      i % 4 === 0 ? null : pick(users, i).id,
      (i % 50) * 250 + 500,
      status,
      createdAt,
      createdAt,
      assessed === 0 ? null : assessed * 3,
      assessed,
      i % 23 === 0 ? 1 : 0,
      assessed === 0 ? -1 : assessed * 3,
    ]);
    // 0–3 applications per deal, ~15% with none
    const appCount = i % 7 === 0 ? 0 : (i % 3) + 1;
    const used = new Set();
    for (let a = 0; a < appCount; a += 1) {
      const code = pick(APPLICATIONS, i + a * 3);
      if (used.has(code)) continue;
      used.add(code);
      appRows.push([id, code]);
    }
  }
  for (let i = 0; i < dealRows.length; i += 1000) {
    await conn.batch(
      `INSERT INTO deal (id, slug, title, companyId, contactId, stageId, sourceId, ownerUserId, valueEstimate, status, createdAt, updatedAt, leadScore, leadScoreAssessed, leadScoreNoMatch, leadScoreSort, isHot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      dealRows.slice(i, i + 1000),
    );
  }
  console.log(`  deals: ${dealRows.length}`);
  for (let i = 0; i < appRows.length; i += 2000) {
    await conn.batch(
      "INSERT INTO deal_application (dealId, code) VALUES (?, ?)",
      appRows.slice(i, i + 2000),
    );
  }
  console.log(`  deal_applications: ${appRows.length}`);

  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  for (const table of ["deal", "company", "contact", "deal_application"]) {
    await conn.query(`ANALYZE TABLE \`${table}\``);
  }
}

try {
  await applyMigrations();
  await seed();
  const [{ c: deals }] = await conn.query("SELECT COUNT(*) AS c FROM deal");
  const [{ c: companies }] = await conn.query("SELECT COUNT(*) AS c FROM company");
  const [{ c: contacts }] = await conn.query("SELECT COUNT(*) AS c FROM contact");
  console.log(`\nbench dataset ready: ${deals} leads, ${companies} bedrijven, ${contacts} contacten`);
} finally {
  await conn.end();
}
