import type { Metadata } from "next";
import { LeadsBrowser } from "@/components/deal/leads-browser";
import { LeadsKanban } from "@/components/deal/leads-kanban";
import {
  formatListContactName,
  LeadsListTable,
} from "@/components/deal/leads-list-table";
import { ListPagination } from "@/components/list/list-pagination";
import { requireSession } from "@/lib/auth-session";
import {
  getDealFilterFacets,
  listAllDeals,
  listDealStages,
  listDealTeamMembers,
  listDeals,
  listLeadSources,
} from "@/lib/deal-service";
import {
  buildDealsExportHref,
  buildDealsHref,
  parseDealsSearchParams,
} from "@/lib/deals-query";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const parsed = parseDealsSearchParams(params);
  const currentUserId = session.user.id;

  const listFilters = {
    zoeken: parsed.zoeken,
    stageId: parsed.fase || undefined,
    sourceId: parsed.bron || undefined,
    eigenaar: parsed.eigenaar,
    status: parsed.status,
    waardeMin: parsed.waardeMin || undefined,
    waardeMax: parsed.waardeMax || undefined,
    van: parsed.van || undefined,
    tot: parsed.tot || undefined,
    datumveld: parsed.datumveld,
    sortering: parsed.sortering,
  };

  const filterValues = {
    zoeken: parsed.zoeken,
    fase: parsed.fase,
    bron: parsed.bron,
    eigenaar: parsed.eigenaar,
    status: parsed.status,
    waardeMin: parsed.waardeMin,
    waardeMax: parsed.waardeMax,
    van: parsed.van,
    tot: parsed.tot,
    datumveld: parsed.datumveld,
    sortering: parsed.sortering,
  };

  const [stages, sources, members, facets, result] = await Promise.all([
    listDealStages(),
    listLeadSources(),
    listDealTeamMembers(),
    getDealFilterFacets(listFilters, currentUserId),
    parsed.view === "kanban"
      ? listAllDeals(listFilters, currentUserId)
      : listDeals(
          { ...listFilters, page: parsed.pagina, pageSize: 25 },
          currentUserId,
        ),
  ]);

  const ownerNames = new Map(
    members.map((member) => [member.id, member.name || member.email]),
  );

  const hasFilters = Boolean(
    parsed.zoeken ||
      parsed.fase ||
      parsed.bron ||
      parsed.eigenaar !== "alle" ||
      parsed.status !== "alle" ||
      parsed.waardeMin ||
      parsed.waardeMax ||
      parsed.van ||
      parsed.tot,
  );

  let emptyMessage = "Nog geen leads. Voeg de eerste lead toe.";
  if (result.total === 0 && hasFilters) {
    if (parsed.eigenaar === "aan-mij" && !parsed.zoeken && !parsed.fase && !parsed.bron) {
      emptyMessage = "Geen leads aan jou toegewezen.";
    } else {
      emptyMessage = "Geen leads gevonden voor deze filters.";
    }
  }

  const summary =
    result.total === 0
      ? hasFilters
        ? "Geen resultaten"
        : "Nog geen leads"
      : `${result.total} ${result.total === 1 ? "lead" : "leads"}`;

  const exportHref = buildDealsExportHref(filterValues);
  const pageSize = "pageSize" in result ? result.pageSize : 25;
  const totalPages = Math.max(Math.ceil(result.total / pageSize), 1);

  function pageHref(nextPage: number) {
    return buildDealsHref({
      ...filterValues,
      view: parsed.view,
      pagina: nextPage,
    });
  }

  return (
    <LeadsBrowser
      values={filterValues}
      view={parsed.view}
      stages={stages.map((stage) => ({ id: stage.id, name: stage.name }))}
      sources={sources.map((source) => ({ id: source.id, name: source.name }))}
      members={members}
      facets={facets}
      exportHref={exportHref}
      summary={summary}
    >
      {parsed.view === "kanban" ? (
        <LeadsKanban
          stages={stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            isWon: stage.isWon,
            isLost: stage.isLost,
          }))}
          deals={result.items.map((deal) => ({
            id: deal.id,
            title: deal.title,
            stageId: deal.stageId,
            companyName: deal.company?.name ?? null,
            valueEstimate:
              deal.valueEstimate == null ? null : Number(deal.valueEstimate),
          }))}
        />
      ) : (
        <>
          <LeadsListTable
            rows={result.items.map((deal) => ({
              id: deal.id,
              title: deal.title,
              companyName: deal.company?.name ?? null,
              contactName: formatListContactName(deal.contact),
              stageName: deal.stage.name,
              isWon: deal.stage.isWon,
              isLost: deal.stage.isLost,
              valueEstimate:
                deal.valueEstimate == null ? null : Number(deal.valueEstimate),
              sourceName: deal.source?.name ?? null,
              ownerName: deal.ownerUserId
                ? (ownerNames.get(deal.ownerUserId) ?? null)
                : null,
              createdAt: deal.createdAt.toISOString(),
            }))}
            emptyMessage={emptyMessage}
          />
          <ListPagination
            page={parsed.pagina}
            totalPages={totalPages}
            hrefForPage={pageHref}
          />
        </>
      )}
    </LeadsBrowser>
  );
}
