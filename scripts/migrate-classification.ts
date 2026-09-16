import { getPrismaClient } from "@/lib/db";
import {
  migrateApplicationLabel,
  migrateIndustryLabel,
  migrateSectorLabel,
  sectorBelongsToIndustry,
} from "@/lib/classification";

/**
 * Herhaalbare, conservatieve migratie van eenduidige branche-/toepassingslabels.
 * Geen gissingen op bedrijfsnaam of e-maildomein. Conflicten worden alleen
 * gerapporteerd. Bestaande bedrijfsclassificatie wordt niet overschreven.
 *
 * Draaien: pnpm tsx --env-file=.env.local --conditions react-server scripts/migrate-classification.ts
 * Preview: pnpm tsx --env-file=.env.local --conditions react-server scripts/migrate-classification.ts -- --dry-run
 */
const dryRun = process.argv.includes("--dry-run");

type Conflict = {
  companyId: string;
  name: string;
  field: "industry" | "sector" | "application";
  values: string[];
};

async function main() {
  const prisma = getPrismaClient();
  const conflicts: Conflict[] = [];
  let companiesUpdated = 0;
  let applicationsCreated = 0;

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      industryCode: true,
      sectorCode: true,
      notes: true,
      deals: {
        select: {
          id: true,
          title: true,
          applications: { select: { code: true } },
          activities: { select: { body: true } },
        },
      },
    },
  });

  for (const company of companies) {
    const industryCandidates = new Set<string>();
    const sectorCandidates = new Map<string, string>();
    const applicationCandidates = new Set<string>();

    const noteIndustry = migrateIndustryLabel(company.notes);
    if (noteIndustry) industryCandidates.add(noteIndustry);
    const noteSector = migrateSectorLabel(company.notes, noteIndustry);
    if (noteSector) {
      industryCandidates.add(noteSector.industryCode);
      sectorCandidates.set(noteSector.sectorCode, noteSector.industryCode);
    }

    for (const deal of company.deals) {
      const sources = [deal.title, ...deal.activities.map((item) => item.body ?? "")];
      for (const source of sources) {
        const industry = migrateIndustryLabel(source);
        if (industry) industryCandidates.add(industry);
        const sector = migrateSectorLabel(source, industry ?? company.industryCode);
        if (sector) {
          industryCandidates.add(sector.industryCode);
          sectorCandidates.set(sector.sectorCode, sector.industryCode);
        }
        const application = migrateApplicationLabel(source);
        if (application) applicationCandidates.add(application);
      }
    }

    if (industryCandidates.size > 1) {
      conflicts.push({
        companyId: company.id,
        name: company.name,
        field: "industry",
        values: [...industryCandidates],
      });
    } else if (
      !company.industryCode &&
      industryCandidates.size === 1
    ) {
      const industryCode = [...industryCandidates][0] ?? null;
      const matchingSectors = [...sectorCandidates.entries()].filter(
        ([, industry]) => industry === industryCode,
      );
      const sectorCode =
        matchingSectors.length === 1 &&
        sectorBelongsToIndustry(industryCode, matchingSectors[0]?.[0] ?? null)
          ? (matchingSectors[0]?.[0] ?? null)
          : null;
      if (matchingSectors.length > 1) {
        conflicts.push({
          companyId: company.id,
          name: company.name,
          field: "sector",
          values: matchingSectors.map(([code]) => code),
        });
      }
      if (!dryRun && industryCode) {
        await prisma.company.update({
          where: { id: company.id },
          data: { industryCode, sectorCode },
        });
      }
      companiesUpdated += 1;
    }

    for (const deal of company.deals) {
      if (deal.applications.length > 0) continue;
      const found = new Set<string>();
      for (const source of [deal.title, ...deal.activities.map((item) => item.body ?? "")]) {
        const application = migrateApplicationLabel(source);
        if (application) found.add(application);
      }
      if (found.size !== 1) {
        if (found.size > 1) {
          conflicts.push({
            companyId: company.id,
            name: company.name,
            field: "application",
            values: [...found],
          });
        }
        continue;
      }
      const code = [...found][0];
      if (!code) continue;
      if (!dryRun) {
        await prisma.dealApplication.create({
          data: { dealId: deal.id, code },
        });
      }
      applicationsCreated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        companiesUpdated,
        applicationsCreated,
        conflicts,
        note:
          "Alleen eenduidige labels zijn gemigreerd. Ontbrekende waarden zijn niet ingevuld op basis van bedrijfsnaam of domein.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
