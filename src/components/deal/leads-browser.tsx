"use client";

import { CreateLeadListDialog } from "@/components/deal/create-lead-list-dialog";
import type { DealFormContact, DealFormOption } from "@/components/deal/deal-form";
import { LeadsFilters } from "@/components/deal/leads-filters";
import { LeadsViewSwitcher } from "@/components/deal/leads-view-switcher";
import { ListBody, ListBrowser, useListNavigation } from "@/components/list/list-browser";
import {
  PageHeader,
  pageActionSecondaryClassName,
} from "@/components/shell/page-header";
import type { DealFilterFacets, DealTeamMember } from "@/lib/deal-service";
import type { DealsFilterValues, DealsView } from "@/lib/deals-query";

export function LeadsBrowser({
  values,
  view,
  stages,
  sources,
  companies,
  contacts,
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
  companies: DealFormOption[];
  contacts: DealFormContact[];
  members: DealTeamMember[];
  facets: DealFilterFacets;
  exportHref: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <ListBrowser>
      <LeadsBrowserChrome
        values={values}
        view={view}
        stages={stages}
        sources={sources}
        companies={companies}
        contacts={contacts}
        members={members}
        facets={facets}
        exportHref={exportHref}
        summary={summary}
      />
      <ListBody>{children}</ListBody>
    </ListBrowser>
  );
}

function LeadsBrowserChrome({
  values,
  view,
  stages,
  sources,
  companies,
  contacts,
  members,
  facets,
  exportHref,
  summary,
}: {
  values: DealsFilterValues;
  view: DealsView;
  stages: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  companies: DealFormOption[];
  contacts: DealFormContact[];
  members: DealTeamMember[];
  facets: DealFilterFacets;
  exportHref: string;
  summary: string;
}) {
  const { isPending, startTransition } = useListNavigation();

  return (
    <>
      <PageHeader
        title="Leads"
        description="Verkooppijplijn. Filter via de URL; sleep een kaart om de fase te wijzigen."
        meta={[summary]}
        actions={
          <>
            <div className="hidden sm:block">
              <LeadsViewSwitcher
                view={view}
                values={values}
                startTransition={startTransition}
                disabled={isPending}
              />
            </div>
            <a href={exportHref} className={pageActionSecondaryClassName()}>
              Exporteren
            </a>
            <CreateLeadListDialog
              stages={stages}
              sources={sources}
              companies={companies}
              contacts={contacts}
            />
          </>
        }
      />
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
    </>
  );
}
