import Link from "next/link";
import { DealHotIcon } from "@/components/deal/deal-hot-icon";
import { LeadScoreView } from "@/components/deal/lead-score-view";
import { LeadOwnerSelect } from "@/components/deal/lead-owner-select";
import {
  LeadStageSelect,
  type LeadStageOption,
} from "@/components/deal/lead-stage-select";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardContext,
  ListCardControl,
  ListCardDate,
  ListCardEmpty,
  ListCardFacts,
  ListCardFooter,
  ListCardSignals,
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
import { cn } from "@/lib/cn";
import { formatDate, formatEuro, formatPersonName } from "@/lib/format";
import {
  hasLeadCardFacts,
  leadCardFacts,
  leadCardPhone,
  telHref,
} from "@/lib/lead-card";
import { joinMeta } from "@/lib/list-copy";
import type { DealTeamMember } from "@/lib/deal-service";
import { dealPath } from "@/lib/paths";
import {
  leadScoreFromDeal,
  type LeadScoreAnswerFields,
} from "@/lib/lead-score";
import {
  quoteStatusLabels,
  quoteStatusTones,
  type QuoteStatusInput,
} from "@/lib/quote-validation";

export type LeadsListRow = {
  id: string;
  slug: string;
  title: string;
  company: { slug: string; name: string; phone: string | null } | null;
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
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
} & LeadScoreAnswerFields;

function LeadPhoneLink({
  row,
  className,
  fallback = null,
}: {
  row: LeadsListRow;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const phone = leadCardPhone(row);
  if (!phone) return fallback;
  return (
    <a href={telHref(phone)} className={cn("hover:underline", className)}>
      {phone}
    </a>
  );
}

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
      {rows.map((row) => {
        const context = joinMeta([
          row.company?.name,
          row.contact
            ? formatPersonName(row.contact.firstName, row.contact.lastName)
            : null,
        ]);
        const facts = leadCardFacts({
          valueEstimate: row.valueEstimate,
          quoteStatus: row.quoteStatus,
          sourceName: row.sourceName,
        });
        const phone = leadCardPhone(row);

        return (
          <ListCard key={row.id} interactive>
            <ListCardTitle href={dealPath(row)}>
              <span className="inline-flex min-w-0 items-start gap-1">
                <span className="min-w-0 break-words">{row.title}</span>
                {row.isHot ? <DealHotIcon className="mt-0.5" /> : null}
              </span>
            </ListCardTitle>
            {context ? <ListCardContext>{context}</ListCardContext> : null}
            {phone ? (
              <ListCardControl>
                <LeadPhoneLink row={row} className="text-sm text-fg-muted" />
              </ListCardControl>
            ) : null}
            <ListCardSignals>
              <ListCardControl>
                <LeadStageSelect
                  dealId={row.id}
                  stageId={row.stageId}
                  stageName={row.stageName}
                  stages={stages}
                />
              </ListCardControl>
              <ListCardControl>
                <LeadScoreView result={leadScoreFromDeal(row)} compact />
              </ListCardControl>
            </ListCardSignals>
            {hasLeadCardFacts(facts) ? (
              <ListCardFacts>
                {facts.value ? (
                  <span className="tabular-nums text-fg">{facts.value}</span>
                ) : null}
                {facts.quoteStatus ? (
                  <Badge
                    tone={quoteStatusTones[facts.quoteStatus]}
                    className="h-auto min-h-5 max-w-full whitespace-normal"
                  >
                    {quoteStatusLabels[facts.quoteStatus]}
                  </Badge>
                ) : null}
                {facts.sourceName ? <span>{facts.sourceName}</span> : null}
              </ListCardFacts>
            ) : null}
            <ListCardFooter>
              <ListCardControl className="min-w-0 flex-1">
                <LeadOwnerSelect
                  dealId={row.id}
                  ownerUserId={row.ownerUserId}
                  ownerName={row.ownerName}
                  ownerImage={row.ownerImage}
                  members={members}
                />
              </ListCardControl>
              <ListCardDate>
                {formatDate(new Date(row.createdAt))}
              </ListCardDate>
            </ListCardFooter>
          </ListCard>
        );
      })}
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
            <TableHeaderCell>Telefoon</TableHeaderCell>
            <TableHeaderCell>Fase</TableHeaderCell>
            <TableHeaderCell>Leadscore</TableHeaderCell>
            <TableHeaderCell>Offerte</TableHeaderCell>
            <TableHeaderCell align="right">Waarde</TableHeaderCell>
            <TableHeaderCell>Bron</TableHeaderCell>
            <TableHeaderCell>Eigenaar</TableHeaderCell>
            <TableHeaderCell>Datum</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={10}>
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
                <TableCell className="text-fg-muted whitespace-nowrap">
                  <LeadPhoneLink row={row} fallback="—" />
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
                  <LeadScoreView result={leadScoreFromDeal(row)} compact />
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
