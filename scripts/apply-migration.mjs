/**
 * Past één specifieke migratiemap toe op de database uit de omgeving.
 *
 * Nodig omdat `prisma migrate deploy` álle openstaande migraties toepast. Soms
 * wil je er precies één, bijvoorbeeld als een andere migratie bij werk hoort
 * dat nog niet af is.
 *
 * Splitst op blokniveau, zodat triggers met BEGIN…END heel blijven.
 * Tolereert al bestaande kolommen, indexen en triggers, dus herhalen is veilig.
 *
 * Gebruik (de databasenaam moet expliciet kloppen, als vangnet):
 *   node --env-file=.env.local scripts/apply-migration.mjs <migratie> --confirm <dbnaam>
 *
 * Registreer de migratie daarna bij Prisma:
 *   pnpm prisma migrate resolve --applied <migratie>
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mariadb from "mariadb";

const [name, confirmFlag, confirmValue] = process.argv.slice(2);
const DB = process.env.DATABASE_NAME;

if (!name) {
  throw new Error(
    "usage: apply-migration.mjs <migratie> --confirm <dbnaam>",
  );
}
if (confirmFlag !== "--confirm" || confirmValue !== DB) {
  throw new Error(
    `Bevestiging ontbreekt of klopt niet. Verwacht: --confirm ${DB ?? "<dbnaam>"}`,
  );
}

const sql = readFileSync(
  join(process.cwd(), "prisma", "migrations", name, "migration.sql"),
  "utf8",
);

/** Splitst SQL op statements, met BEGIN…END als één blok. */
function statements(text) {
  const body = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const out = [];
  let buffer = "";
  let depth = 0;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    buffer += (buffer ? "\n" : "") + raw;
    if (/\bBEGIN\b/i.test(line)) depth += 1;
    if (/\bEND\b\s*;?\s*$/i.test(line) && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        out.push(buffer.replace(/;\s*$/, ""));
        buffer = "";
      }
      continue;
    }
    if (depth === 0 && line.endsWith(";")) {
      out.push(buffer.replace(/;\s*$/, ""));
      buffer = "";
    }
  }
  if (buffer.trim()) out.push(buffer);
  return out;
}

const ALREADY_THERE = [
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_TRG_ALREADY_EXISTS",
  "ER_TABLE_EXISTS_ERROR",
];

const conn = await mariadb.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: DB,
  ssl: true,
  multipleStatements: true,
});

console.log(`migratie ${name} → database ${DB}\n`);

try {
  for (const statement of statements(sql)) {
    const head = statement.split("\n")[0].slice(0, 88);
    try {
      await conn.query(statement);
      console.log("  ok   " + head);
    } catch (error) {
      if (ALREADY_THERE.includes(error.code ?? "")) {
        console.log("  staat er al   " + head);
        continue;
      }
      throw new Error(
        `${error.message}\n--- statement ---\n${statement.slice(0, 600)}`,
      );
    }
  }
  console.log("\nklaar.");
} finally {
  await conn.end();
}
