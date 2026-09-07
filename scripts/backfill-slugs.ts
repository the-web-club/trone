import { getPrismaClient } from "@/lib/db";
import { allocateUniqueSlug, personSlugSource } from "@/lib/slug";

const PLACEHOLDER_RE = /^[bcd]-[0-9a-f]{32}$/;

function isPlaceholder(slug: string) {
  return PLACEHOLDER_RE.test(slug);
}

async function main() {
  const prisma = getPrismaClient();
  const [companies, contacts, deals] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.contact.findMany({
      select: { id: true, firstName: true, lastName: true, slug: true },
    }),
    prisma.deal.findMany({ select: { id: true, title: true, slug: true } }),
  ]);

  function takenSet(
    rows: Array<{ slug: string }>,
  ): Set<string> {
    return new Set(
      rows.map((row) => row.slug).filter((slug) => !isPlaceholder(slug)),
    );
  }

  const companyTaken = takenSet(companies);
  const contactTaken = takenSet(contacts);
  const dealTaken = takenSet(deals);

  async function nextSlug(
    taken: Set<string>,
    source: string,
    fallback: string,
  ) {
    const slug = await allocateUniqueSlug(
      async (candidate) => taken.has(candidate),
      source,
      fallback,
    );
    taken.add(slug);
    return slug;
  }

  const companyUpdates = [];
  for (const company of companies) {
    if (!isPlaceholder(company.slug)) continue;
    companyUpdates.push({
      id: company.id,
      slug: await nextSlug(companyTaken, company.name, "bedrijf"),
    });
  }

  const contactUpdates = [];
  for (const contact of contacts) {
    if (!isPlaceholder(contact.slug)) continue;
    contactUpdates.push({
      id: contact.id,
      slug: await nextSlug(
        contactTaken,
        personSlugSource(contact.firstName, contact.lastName),
        "contact",
      ),
    });
  }

  const dealUpdates = [];
  for (const deal of deals) {
    if (!isPlaceholder(deal.slug)) continue;
    dealUpdates.push({
      id: deal.id,
      slug: await nextSlug(dealTaken, deal.title, "lead"),
    });
  }

  const total =
    companyUpdates.length + contactUpdates.length + dealUpdates.length;
  console.log(
    `placeholders: ${companyUpdates.length} bedrijven, ${contactUpdates.length} contacten, ${dealUpdates.length} leads`,
  );

  let updated = 0;
  for (const row of companyUpdates) {
    await prisma.$executeRaw`UPDATE company SET slug = ${row.slug} WHERE id = ${row.id}`;
    updated += 1;
    if (updated % 100 === 0) console.log(`  ${updated}/${total}`);
  }
  for (const row of contactUpdates) {
    await prisma.$executeRaw`UPDATE contact SET slug = ${row.slug} WHERE id = ${row.id}`;
    updated += 1;
    if (updated % 100 === 0) console.log(`  ${updated}/${total}`);
  }
  for (const row of dealUpdates) {
    await prisma.$executeRaw`UPDATE deal SET slug = ${row.slug} WHERE id = ${row.id}`;
    updated += 1;
    if (updated % 100 === 0) console.log(`  ${updated}/${total}`);
  }

  console.log(`slugs bijgewerkt: ${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
