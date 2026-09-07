import Link from "next/link";
import { LeadOwnerSelect } from "@/components/deal/lead-owner-select";
import {
  LeadStageSelect,
  type LeadStageOption,
} from "@/components/deal/lead-stage-select";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
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
  ownerUserId: string | null;
  ownerName: string | null;
  createdAt: string;
};

export function LeadsListTable({
  rows,
  members,
  stages,
  emptyMessage,
}: {
  rows: LeadsListRow[];
  members: DealTeamMember[];
  stages: LeadStageOption[];
  emptyMessage: string;
}) {
  return (
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
            <TableEmptyRow colSpan={8}>{emptyMessage}</TableEmptyRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} interactive>
                <TableCell>
                  <Link
                    href={dealPath(row)}
                    className="font-medium text-fg hover:underline"
                  >
                    {row.title}
                  </Link>
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
}
