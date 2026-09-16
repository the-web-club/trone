/**
 * EXPLAIN op de queryvormen die de lijstfilters gebruiken.
 * Read-only: alleen EXPLAIN en SELECT COUNT(*). Bedoeld om voor en na een
 * migratie te vergelijken.
 *
 *   node --env-file=.env.local scripts/explain-list-queries.mjs
 */
import mariadb from "mariadb";

const DB = process.env.DATABASE_NAME;

const conn = await mariadb.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: DB,
  ssl: true,
});

const hasSearchIndex =
  Number(
    (
      await conn.query(
        "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='deal' AND COLUMN_NAME='searchIndex'",
        [DB],
      )
    )[0].n,
  ) > 0;

const counts = {
  deal: Number((await conn.query("SELECT COUNT(*) AS n FROM deal"))[0].n),
  company: Number((await conn.query("SELECT COUNT(*) AS n FROM company"))[0].n),
  contact: Number((await conn.query("SELECT COUNT(*) AS n FROM contact"))[0].n),
};

console.log(`database ${DB}`);
console.log(
  `records: ${counts.deal} leads, ${counts.company} bedrijven, ${counts.contact} contacten`,
);
console.log(`deal.searchIndex aanwezig: ${hasSearchIndex}\n`);

async function explain(label, sql, params = []) {
  try {
    const rows = await conn.query(`EXPLAIN ${sql}`, params);
    const r = rows[0];
    console.log(
      `${label.padEnd(44)} type=${r.type} key=${r.key ?? "NULL"} rows=${r.rows} ${r.Extra ?? ""}`,
    );
  } catch (error) {
    console.log(`${label.padEnd(44)} (n.v.t.: ${error.code})`);
  }
}

async function time(label, sql, params = []) {
  try {
    await conn.query(sql, params);
    const runs = [];
    for (let i = 0; i < 3; i += 1) {
      const t = performance.now();
      await conn.query(sql, params);
      runs.push(performance.now() - t);
    }
    runs.sort((a, b) => a - b);
    console.log(`${label.padEnd(44)} ${String(Math.round(runs[0])).padStart(4)} ms`);
  } catch (error) {
    console.log(`${label.padEnd(44)} (n.v.t.: ${error.code})`);
  }
}

console.log("--- sortering van de lijsten ---");
await explain(
  "bedrijven ORDER BY name",
  "SELECT id FROM company ORDER BY name ASC, id ASC LIMIT 25",
);
await time(
  "bedrijven ORDER BY name",
  "SELECT id, name FROM company ORDER BY name ASC, id ASC LIMIT 25",
);
await explain(
  "contacten ORDER BY firstName,lastName",
  "SELECT id FROM contact ORDER BY firstName ASC, lastName ASC LIMIT 25",
);
await time(
  "contacten ORDER BY firstName,lastName",
  "SELECT id FROM contact ORDER BY firstName ASC, lastName ASC LIMIT 25",
);
await explain(
  "leads stabiele sortering",
  "SELECT id FROM deal ORDER BY createdAt DESC, id DESC LIMIT 25",
);
await explain(
  "leads sortering gewijzigd",
  "SELECT id FROM deal ORDER BY updatedAt DESC, id DESC LIMIT 25",
);

console.log("\n--- filter + sortering ---");
await explain(
  "leads status + sortering",
  "SELECT id FROM deal WHERE status='OPEN' ORDER BY createdAt DESC, id DESC LIMIT 25",
);
await explain(
  "leads fase + sortering",
  "SELECT id FROM deal d JOIN deal_stage s ON s.id=d.stageId WHERE s.sortOrder=0 ORDER BY d.createdAt DESC LIMIT 25",
);
await explain(
  "bedrijven plaats-facet met land",
  "SELECT city, COUNT(*) FROM company WHERE country='NL' GROUP BY city",
);
await time(
  "bedrijven plaats-facet met land",
  "SELECT city, COUNT(*) FROM company WHERE country='NL' GROUP BY city",
);

console.log("\n--- zoeken op leads ---");
const relational = `SELECT COUNT(*) AS n FROM deal d
   WHERE d.title LIKE ?
      OR EXISTS (SELECT 1 FROM company c WHERE c.id = d.companyId AND c.name LIKE ?)
      OR EXISTS (SELECT 1 FROM contact ct WHERE ct.id = d.contactId
                  AND (ct.firstName LIKE ? OR ct.lastName LIKE ?))`;
await time("relationeel predicaat (oud)", relational, ["%jan%", "%jan%", "%jan%", "%jan%"]);
if (hasSearchIndex) {
  await time("searchIndex (nieuw)", "SELECT COUNT(*) AS n FROM deal d WHERE d.searchIndex LIKE ?", ["%jan%"]);
  const oud = Number((await conn.query(relational, ["%jan%", "%jan%", "%jan%", "%jan%"]))[0].n);
  const nieuw = Number(
    (await conn.query("SELECT COUNT(*) AS n FROM deal d WHERE d.searchIndex LIKE ?", ["%jan%"]))[0].n,
  );
  console.log(`gelijkwaardigheid 'jan': oud=${oud} nieuw=${nieuw} ${oud === nieuw ? "OK" : "AFWIJKING"}`);

  const stale = Number(
    (
      await conn.query(`SELECT COUNT(*) AS n FROM deal d
        LEFT JOIN company c ON c.id = d.companyId
        LEFT JOIN contact ct ON ct.id = d.contactId
        WHERE NOT (d.searchIndex <=> LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName)))`)
    )[0].n,
  );
  console.log(`searchIndex uit sync: ${stale} rijen ${stale === 0 ? "OK" : "LET OP"}`);
}

console.log("\n--- facet-aggregatie ---");
await time(
  "leads branche-facet (JOIN + GROUP BY)",
  "SELECT c.industryCode, COUNT(*) FROM deal d LEFT JOIN company c ON c.id=d.companyId GROUP BY c.industryCode",
);
await time(
  "contacten toepassing-facet COUNT(DISTINCT)",
  `SELECT da.code, COUNT(DISTINCT ct.id) FROM contact ct
     JOIN deal d ON d.contactId = ct.id
     JOIN deal_application da ON da.dealId = d.id
    GROUP BY da.code`,
);
await time(
  "bedrijven lead-bucket",
  `SELECT bucket, COUNT(*) FROM (
     SELECT CASE WHEN n=0 THEN 'geen' WHEN n>=5 THEN '5plus' ELSE CAST(n AS CHAR) END AS bucket
       FROM (SELECT (SELECT COUNT(*) FROM deal d WHERE d.companyId=co.id) AS n FROM company co) x
   ) y GROUP BY bucket`,
);

console.log("\n--- indexen op deal/company/contact ---");
for (const table of ["deal", "company", "contact"]) {
  const rows = await conn.query(
    "SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? GROUP BY INDEX_NAME ORDER BY INDEX_NAME",
    [DB, table],
  );
  console.log(`  ${table}:`);
  for (const r of rows) console.log(`    ${r.INDEX_NAME} (${r.cols})`);
}

const triggers = await conn.query(
  "SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?",
  [DB],
);
console.log("\n--- triggers ---");
if (triggers.length === 0) console.log("  (geen)");
for (const t of triggers) {
  console.log(
    `  ${t.TRIGGER_NAME} ${t.ACTION_TIMING} ${t.EVENT_MANIPULATION} ON ${t.EVENT_OBJECT_TABLE}`,
  );
}

await conn.end();
