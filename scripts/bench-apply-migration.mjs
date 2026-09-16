/** Past één migratiemap toe op de bench-database. Alleen voor benchmarken. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mariadb from "mariadb";

const DB = process.env.DATABASE_NAME;
if (!DB || !DB.includes("bench")) throw new Error("bench DB only");

const name = process.argv[2];
if (!name) throw new Error("usage: bench-apply-migration.mjs <migration-dir>");

const sql = readFileSync(
  join(process.cwd(), "prisma", "migrations", name, "migration.sql"),
  "utf8",
);

const conn = await mariadb.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: DB,
  ssl: true,
  multipleStatements: true,
});

// Triggers bevatten BEGIN…END met interne puntkomma's; splits op blokniveau.
function statements(text) {
  const lines = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const out = [];
  let buffer = "";
  let depth = 0;
  for (const raw of lines.split("\n")) {
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

const tolerable = [
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_TRG_ALREADY_EXISTS",
];

try {
  for (const statement of statements(sql)) {
    try {
      await conn.query(statement);
      console.log("ok: " + statement.split("\n")[0].slice(0, 90));
    } catch (error) {
      if (tolerable.includes(error.code ?? "")) {
        console.log("skip (bestaat al): " + statement.split("\n")[0].slice(0, 70));
        continue;
      }
      throw new Error(`${error.message}\n--- SQL ---\n${statement.slice(0, 500)}`);
    }
  }
  await conn.query("ANALYZE TABLE deal");
  await conn.query("ANALYZE TABLE company");
  await conn.query("ANALYZE TABLE contact");
  console.log("\nmigratie toegepast op " + DB);
} finally {
  await conn.end();
}
