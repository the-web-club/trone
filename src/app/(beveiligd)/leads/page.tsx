import type { Metadata } from "next";
import Link from "next/link";
import { LeadsKanban } from "@/components/deal/leads-kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listDealStages, listDeals } from "@/lib/deal-service";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const { q, stage } = await searchParams;
  const query = q?.trim() ?? "";
  const stageId = stage?.trim() || undefined;

  const [stages, deals] = await Promise.all([
    listDealStages(),
    listDeals({ query: query || undefined, stageId }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Leads</h1>
          <p className="page-header-description">
            Verkooppijplijn. Sleep een kaart naar een andere fase, of kies de
            fase in de lijst.
          </p>
        </div>
        <div className="page-actions">
          <Link
            href="/leads/nieuw"
            className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover"
          >
            Nieuwe lead
          </Link>
        </div>
      </header>

      <form method="get" className="flex max-w-2xl flex-wrap gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Zoek op titel of bedrijf"
          defaultValue={query}
          aria-label="Zoek leads"
          className="max-w-xs"
        />
        <Select name="stage" defaultValue={stageId ?? ""} className="max-w-48" aria-label="Filter op fase">
          <option value="">Alle fases</option>
          {stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filteren
        </Button>
      </form>

      <LeadsKanban
        stages={stages.map((item) => ({
          id: item.id,
          name: item.name,
          isWon: item.isWon,
          isLost: item.isLost,
        }))}
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          stageId: deal.stageId,
          companyName: deal.company?.name ?? null,
          valueEstimate:
            deal.valueEstimate == null ? null : Number(deal.valueEstimate),
        }))}
      />
    </div>
  );
}
