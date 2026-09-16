/**
 * Baseline/after benchmark for the list-filter data path.
 *
 * Counts Prisma queries and wall-clock time per representative filter action,
 * using the real service functions. Run with:
 *   pnpm tsx --env-file=.env.local --conditions react-server scripts/bench-filters.ts
 */
import { getPrismaClient } from "@/lib/db";

type QueryLogEntry = { query: string; params: string; duration: number };

const collected: QueryLogEntry[] = [];
let collecting = false;

function startCollecting() {
  collected.length = 0;
  collecting = true;
}

function stopCollecting(): QueryLogEntry[] {
  collecting = false;
  return [...collected];
}

async function measure<T>(
  label: string,
  run: () => Promise<T>,
): Promise<{ label: string; ms: number; queries: number; bytes: number; entries: QueryLogEntry[] }> {
  startCollecting();
  const started = performance.now();
  const result = await run();
  const ms = performance.now() - started;
  const entries = stopCollecting();
  const bytes = Buffer.byteLength(
    JSON.stringify(result, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
    "utf8",
  );
  return { label, ms: Math.round(ms), queries: entries.length, bytes, entries };
}

async function main() {
  const prisma = getPrismaClient();

  // Prisma 7: query events via $on when log includes "query".
  // The adapter-based client needs an explicit event client, so we fall back to
  // wrapping via $extends which works for all engines.
  const traced = prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const started = performance.now();
        const result = await query(args);
        if (collecting) {
          collected.push({
            query: `${model ?? "raw"}.${operation}`,
            params: "",
            duration: performance.now() - started,
          });
        }
        return result;
      },
    },
  });

  // Make services use the traced client.
  (globalThis as { __tronePrisma?: unknown }).__tronePrisma = traced;

  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.count(),
    prisma.company.count(),
    prisma.contact.count(),
  ]);
  console.log(`dataset: ${deals} leads, ${companies} bedrijven, ${contacts} contacten`);

  const { listDeals, getDealFilterFacets, listDealStages, listLeadSources, listDealTeamMembers } =
    await import("@/lib/deal-service");
  const { listCompanyRows, getCompanyFilterFacets, listCompaniesForSelect, listCompanyCities, listCompanyCountries } =
    await import("@/lib/company-service");
  const { listContactRows, getContactFilterFacets, listContactsForSelect } =
    await import("@/lib/contact-service");

  const scenarios: Array<{ label: string; run: () => Promise<unknown> }> = [
    {
      label: "leads: page 1, no filters (full page payload)",
      run: async () =>
        Promise.all([
          listDealStages(),
          listLeadSources(),
          listDealTeamMembers(),
          getDealFilterFacets({}, undefined),
          listDeals({ page: 1, pageSize: 25 }, undefined),
          listCompaniesForSelect(),
          listContactsForSelect(),
        ]),
    },
    {
      label: "leads: search 'jan' (full page payload)",
      run: async () =>
        Promise.all([
          listDealStages(),
          listLeadSources(),
          listDealTeamMembers(),
          getDealFilterFacets({ zoeken: "jan" }, undefined),
          listDeals({ zoeken: "jan", page: 1, pageSize: 25 }, undefined),
          listCompaniesForSelect(),
          listContactsForSelect(),
        ]),
    },
    {
      label: "leads: list query only",
      run: async () => listDeals({ page: 1, pageSize: 25 }, undefined),
    },
    {
      label: "leads: facets only",
      run: async () => getDealFilterFacets({}, undefined),
    },
    {
      label: "leads: facets only + search",
      run: async () => getDealFilterFacets({ zoeken: "jan" }, undefined),
    },
    {
      label: "leads: deep page 40",
      run: async () => listDeals({ page: 40, pageSize: 25 }, undefined),
    },
    {
      label: "bedrijven: page 1 (full page payload)",
      run: async () =>
        Promise.all([
          listCompanyRows({}, undefined),
          listCompanyCities(),
          listCompanyCountries(),
          listDealTeamMembers(),
          getCompanyFilterFacets({}, undefined),
        ]),
    },
    {
      label: "bedrijven: facets only",
      run: async () => getCompanyFilterFacets({}, undefined),
    },
    {
      label: "bedrijven: leads=5plus filter",
      run: async () => listCompanyRows({ leads: "5plus" }, undefined),
    },
    {
      label: "contacten: page 1 (full page payload)",
      run: async () =>
        Promise.all([
          listContactRows({}, undefined),
          listCompaniesForSelect(),
          listDealTeamMembers(),
          getContactFilterFacets({}, undefined),
        ]),
    },
    {
      label: "contacten: facets only",
      run: async () => getContactFilterFacets({}, undefined),
    },
  ];

  // Warm the pool so we do not measure TLS handshake.
  await listDeals({ page: 1, pageSize: 25 }, undefined);

  const results: Array<{ label: string; ms: number; queries: number; bytes: number }> = [];
  for (const scenario of scenarios) {
    // Two runs; report the second (warm) one.
    await scenario.run().catch(() => undefined);
    const measured = await measure(scenario.label, scenario.run as () => Promise<unknown>);
    results.push(measured);
    console.log(
      `${measured.label.padEnd(46)} ${String(measured.ms).padStart(6)} ms  ${String(measured.queries).padStart(3)} queries  ${String(Math.round(measured.bytes / 1024)).padStart(6)} KB`,
    );
    if (process.env.BENCH_VERBOSE) {
      const byOp = new Map<string, number>();
      for (const entry of measured.entries) {
        byOp.set(entry.query, (byOp.get(entry.query) ?? 0) + 1);
      }
      for (const [op, count] of [...byOp.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(count).padStart(3)}x ${op}`);
      }
    }
  }

  console.log("\n| Scenario | ms | queries | payload |");
  console.log("| --- | --- | --- | --- |");
  for (const row of results) {
    console.log(
      `| ${row.label} | ${row.ms} | ${row.queries} | ${Math.round(row.bytes / 1024)} KB |`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
