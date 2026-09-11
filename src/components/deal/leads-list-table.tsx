import Link from "next/link";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { LeadOwnerSelect } from "@/components/deal/lead-owner-select";
import {
  LeadStageSelect,
  type LeadStageOption,
} from "@/components/deal/lead-stage-select";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardEmpty,
  ListCardHeader,
  ListCardMeta,
  ListCardRow,
  ListCardRows,
  ListCardTitle,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEuro } from "@/lib/format";
import type { DealTeamMember } from "@/lib/deal-service";
import { dealPath } from "@/lib/paths";
import {
  quoteStatusLabels,
  quoteStatusTones,
  type QuoteStatusInput,
} from "@/lib/quote-validation";

export type LeadsListRow = {
  id: string;
  slug: string;
  title: string;
  company: { slug: string; name: string } | null;
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  stageId: string;
  stageName: string;
  quoteStatus: QuoteStatusInput | null;
  valueEstimate: number | null;
  sourceName: string | null;
  isHot: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerImage: string | null;
  createdAt: string;
};

function LeadsListCards({
  rows,
  members,
  stages,
  emptyMessage,
  emptyAction,
}: {
  rows: LeadsListRow[];
  members: DealTeamMember[];
  stages: LeadStageOption[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <ListCardEmpty>
        {emptyMessage}
        {emptyAction}
      </ListCardEmpty>
    );
  }

  return (
    <>
      {rows.map((row) => (
        <ListCard key={row.id}>
          <ListCardHeader>
            <div className="min-w-0">
              <ListCardTitle>
                <Link
                  href={dealPath(row)}
                  className="inline-flex min-w-0 items-center gap-1 hover:underline"
                >
                  {row.title}
                  {row.isHot ? <DealHotIcon /> : null}
                </Link>
              </ListCardTitle>
              {row.contact ? (
                <ListCardMeta>
                  <ContactLink contact={row.contact} />
                  {" · "}
                  {formatDate(new Date(row.createdAt))}
                </ListCardMeta>
              ) : (
                <ListCardMeta>{formatDate(new Date(row.createdAt))}</ListCardMeta>
              )}
            </div>
          </ListCardHeader>
          <ListCardRows>
            <ListCardRow label="Bedrijf">
              <CompanyLink company={row.company} />
            </ListCardRow>
            <ListCardRow label="Fase">
              <LeadStageSelect
                dealId={row.id}
                stageId={row.stageId}
                stageName={row.stageName}
                stages={stages}
              />
            </ListCardRow>
            <ListCardRow label="Offerte">
              {row.quoteStatus ? (
                <Badge tone={quoteStatusTones[row.quoteStatus]}>
                  {quoteStatusLabels[row.quoteStatus]}
                </Badge>
              ) : (
                <span className="text-fg-muted">—</span>
              )}
            </ListCardRow>
            <ListCardRow label="Waarde">
              <span className="tabular-nums">
                {formatEuro(row.valueEstimate) ?? "—"}
              </span>
            </ListCardRow>
            <ListCardRow label="Bron">
              {row.sourceName ?? "—"}
            </ListCardRow>
            <ListCardRow label="Eigenaar">
              <LeadOwnerSelect
                dealId={row.id}
                ownerUserId={row.ownerUserId}
                ownerName={row.ownerName}
                ownerImage={row.ownerImage}
                members={members}
              />
            </ListCardRow>
          </ListCardRows>
        </ListCard>
      ))}
    </>
  );
}

export function LeadsListTable({
  rows,
  members,
  stages,
  emptyMessage,
  emptyAction,
}: {
  rows: LeadsListRow[];
  members: DealTeamMember[];
  stages: LeadStageOption[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Titel</TableHeaderCell>
            <TableHeaderCell>Bedrijf</TableHeaderCell>
            <TableHeaderCell>Fase</TableHeaderCell>
            <TableHeaderCell>Offerte</TableHeaderCell>
            <TableHeaderCell align="right">Waarde</TableHeaderCell>
            <TableHeaderCell>Bron</TableHeaderCell>
            <TableHeaderCell>Eigenaar</TableHeaderCell>
            <TableHeaderCell>Datum</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={8}>
              {emptyMessage}
              {emptyAction}
            </TableEmptyRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} interactive>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-1">
                    <Link
                      href={dealPath(row)}
                      className="min-w-0 font-medium text-fg hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.isHot ? <DealHotIcon /> : null}
                  </div>
                  {row.contact ? (
                    <p className="text-xs text-fg-muted">
                      <ContactLink contact={row.contact} />
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-fg-muted">
                  <CompanyLink company={row.company} />
                </TableCell>
                <TableCell>
                  <LeadStageSelect
                    dealId={row.id}
                    stageId={row.stageId}
                    stageName={row.stageName}
                    stages={stages}
                  />
                </TableCell>
                <TableCell>
                  {row.quoteStatus ? (
                    <Badge tone={quoteStatusTones[row.quoteStatus]}>
                      {quoteStatusLabels[row.quoteStatus]}
                    </Badge>
                  ) : (
                    <span className="text-fg-muted">—</span>
                  )}
                </TableCell>
                <TableCell align="right" className="tabular-nums">
                  {formatEuro(row.valueEstimate) ?? "—"}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {row.sourceName ?? "—"}
                </TableCell>
                <TableCell>
                  <LeadOwnerSelect
                    dealId={row.id}
                    ownerUserId={row.ownerUserId}
                    ownerName={row.ownerName}
                    ownerImage={row.ownerImage}
                    members={members}
                  />
                </TableCell>
                <TableCell className="text-fg-muted whitespace-nowrap">
                  {formatDate(new Date(row.createdAt))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile = (
    <LeadsListCards
      rows={rows}
      members={members}
      stages={stages}
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
    />
  );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
