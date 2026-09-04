"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LeadsFilters } from "@/components/deal/leads-filters";
import { LeadsViewSwitcher } from "@/components/deal/leads-view-switcher";
import type { DealFilterFacets, DealTeamMember } from "@/lib/deal-service";
import type { DealsFilterValues, DealsView } from "@/lib/deals-query";

export function LeadsBrowser({
  values,
  view,
  stages,
  sources,
  members,
  facets,
  exportHref,
  summary,
  children,
}: {
  values: DealsFilterValues;
  view: DealsView;
  stages: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  members: DealTeamMember[];
  facets: DealFilterFacets;
  exportHref: string;
  summary: string;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Leads</h1>
          <p className="page-header-description">
            Verkooppijplijn. Filter via de URL; sleep een kaart om de fase te
            wijzigen.
          </p>
          <p className="mt-1 text-xs text-fg-subtle">{summary}</p>
        </div>
        <div className="page-actions">
          <div className="hidden sm:block">
            <LeadsViewSwitcher
              view={view}
              values={values}
              startTransition={startTransition}
              disabled={isPending}
            />
          </div>
          <a
            href={exportHref}
            className="inline-flex h-8 items-center rounded-sm border border-border bg-surface px-3 text-sm font-medium text-fg shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-hover"
          >
            Exporteren
          </a>
          <Link
            href="/leads/nieuw"
            className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover"
          >
            Nieuwe lead
          </Link>
        </div>
      </header>

      <div className="sm:hidden">
        <LeadsViewSwitcher
          view={view}
          values={values}
          startTransition={startTransition}
          disabled={isPending}
        />
      </div>

      <LeadsFilters
        values={values}
        view={view}
        stages={stages}
        sources={sources}
        members={members}
        facets={facets}
        isPending={isPending}
        startTransition={startTransition}
      />

      <div className="list-body" aria-busy={isPending}>
        {children}
      </div>
    </div>
  );
}
