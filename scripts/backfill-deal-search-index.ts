/**
 * Herbouwt het afgeleide zoekveld `deal.searchIndex`.
 *
 * Idempotent: dezelfde invoer levert dezelfde waarden op, en de expressie is
 * identiek aan die in de triggers (zie de migratie). Normaal is dit niet
 * nodig, want de triggers houden de kolom bij. Gebruik dit na een bulk-import
 * die de triggers omzeilt, of als controle.
 *
 * Wijzigt geen businessdata: alleen de afgeleide kolom.
 *
 *   pnpm tsx --env-file=.env.local --conditions react-server \
 *     scripts/backfill-deal-search-index.ts
 */
import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db";

const BATCH = 2000;

async function main() {
  const prisma = getPrismaClient();

  const [{ n: total }] = await prisma.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`SELECT COUNT(*) AS n FROM deal`,
  );

  // Alleen rijen die niet al de juiste waarde hebben; zo is herhalen gratis.
  const [{ n: stale }] = await prisma.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*) AS n
        FROM deal d
        LEFT JOIN company c ON c.id = d.companyId
        LEFT JOIN contact ct ON ct.id = d.contactId
       WHERE NOT (d.searchIndex <=> LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName)))`,
  );

  console.log(`deal-rijen: ${Number(total)}, bij te werken: ${Number(stale)}`);

  let updated = 0;
  for (;;) {
    const affected = await prisma.$executeRaw(Prisma.sql`
      UPDATE deal d
        LEFT JOIN company c ON c.id = d.companyId
        LEFT JOIN contact ct ON ct.id = d.contactId
         SET d.searchIndex = LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName))
       WHERE NOT (d.searchIndex <=> LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName)))
       LIMIT ${BATCH}`);
    if (affected === 0) break;
    updated += affected;
    console.log(`  bijgewerkt: ${updated}`);
  }

  const [{ n: remaining }] = await prisma.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*) AS n
        FROM deal d
        LEFT JOIN company c ON c.id = d.companyId
        LEFT JOIN contact ct ON ct.id = d.contactId
       WHERE NOT (d.searchIndex <=> LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName)))`,
  );

  console.log(
    `klaar. bijgewerkt: ${updated}, nog afwijkend: ${Number(remaining)}`,
  );
  if (Number(remaining) !== 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
