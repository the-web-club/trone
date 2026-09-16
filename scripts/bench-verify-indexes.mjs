import mariadb from "mariadb";

const DB = process.env.DATABASE_NAME;
if (!DB || !DB.includes("bench")) throw new Error("bench DB only");

const conn = await mariadb.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: DB,
  ssl: true,
});

async function explain(label, sql, params = []) {
  const rows = await conn.query(`EXPLAIN ${sql}`, params);
  const first = rows[0];
  const fmt = (r) =>
    `type=${r.type} key=${r.key ?? "NULL"} rows=${r.rows} extra=${r.Extra ?? ""}`;
  console.log(`${label}\n    ${fmt(first)}`);
  return first;
}

console.log("=== TRIGGERS: houdt searchIndex zichzelf bij? ===");
await conn.query("DELETE FROM deal WHERE id = 'trigger-test-deal'");
await conn.query(
  "INSERT INTO deal (id, slug, title, companyId, contactId, stageId, status, createdAt, updatedAt, leadScoreAssessed, leadScoreNoMatch, leadScoreSort, isHot) VALUES ('trigger-test-deal','trigger-test-deal','Zoekbare Titel','bench-company-1','bench-contact-1','stage-nieuw','OPEN',NOW(),NOW(),0,0,-1,0)",
);
let row = await conn.query(
  "SELECT searchIndex FROM deal WHERE id='trigger-test-deal'",
);
console.log("  na INSERT:", row[0].searchIndex);

await conn.query(
  "UPDATE deal SET title='Andere Titel' WHERE id='trigger-test-deal'",
);
row = await conn.query("SELECT searchIndex FROM deal WHERE id='trigger-test-deal'");
console.log("  na UPDATE title:", row[0].searchIndex);

const before = await conn.query("SELECT name FROM company WHERE id='bench-company-1'");
await conn.query(
  "UPDATE company SET name='Herbenoemd Bedrijf BV' WHERE id='bench-company-1'",
);
row = await conn.query("SELECT searchIndex FROM deal WHERE id='trigger-test-deal'");
console.log("  na bedrijfsnaam wijzigen:", row[0].searchIndex);

await conn.query(
  "UPDATE contact SET firstName='Zoekbaar', lastName='Contactnaam' WHERE id='bench-contact-1'",
);
row = await conn.query("SELECT searchIndex FROM deal WHERE id='trigger-test-deal'");
console.log("  na contactnaam wijzigen:", row[0].searchIndex);

// Terugdraaien zodat de dataset stabiel blijft.
await conn.query("UPDATE company SET name=? WHERE id='bench-company-1'", [
  before[0].name,
]);
await conn.query(
  "UPDATE contact SET firstName='Jan', lastName='Jansen' WHERE id='bench-contact-1'",
);
await conn.query("DELETE FROM deal WHERE id = 'trigger-test-deal'");

console.log("\n=== INDEXEN: wordt elke toegevoegde index echt gebruikt? ===");
await explain(
  "company ORDER BY name (was type=ALL + filesort)",
  "SELECT id FROM company ORDER BY name ASC, id ASC LIMIT 25",
);
await explain(
  "contact ORDER BY firstName,lastName (was type=ALL + filesort)",
  "SELECT id FROM contact ORDER BY firstName ASC, lastName ASC LIMIT 25",
);
await explain(
  "deal stabiele sortering createdAt DESC, id DESC",
  "SELECT id FROM deal ORDER BY createdAt DESC, id DESC LIMIT 25",
);
await explain(
  "deal sortering updatedAt DESC, id DESC",
  "SELECT id FROM deal ORDER BY updatedAt DESC, id DESC LIMIT 25",
);
await explain(
  "deal status + stabiele sortering",
  "SELECT id FROM deal WHERE status='OPEN' ORDER BY createdAt DESC, id DESC LIMIT 25",
);
await explain(
  "deal fase + stabiele sortering (kanban-kolom)",
  "SELECT id FROM deal WHERE stageId=? ORDER BY createdAt DESC, id DESC LIMIT 25",
  ["stage-nieuw"],
);
await explain(
  "deal eigenaar + stabiele sortering (aan mij)",
  "SELECT id FROM deal WHERE ownerUserId=? ORDER BY createdAt DESC, id DESC LIMIT 25",
  ["bench-user-1"],
);
await explain(
  "deal zoeken via searchIndex",
  "SELECT id FROM deal WHERE searchIndex LIKE ? ORDER BY createdAt DESC, id DESC LIMIT 25",
  ["%jan%"],
);
await explain(
  "company plaats-facet",
  "SELECT city, COUNT(*) FROM company WHERE country='NL' GROUP BY city",
);

console.log("\n=== deep offset na de index ===");
await explain(
  "deal offset 11000",
  "SELECT id FROM deal ORDER BY createdAt DESC, id DESC LIMIT 25 OFFSET 11000",
);

await conn.end();
