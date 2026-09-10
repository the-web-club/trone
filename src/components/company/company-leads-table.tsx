import { DealStagePill } from "@/components/deal/deal-stage-pill";
import { DetailSection } from "@/components/detail/detail-layout";
import { ContactLink, DealLink } from "@/components/entity-links";
import {
  CompactRecordList,
  CompactRecordRow,
  ResponsiveListView,
} from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { dealPath } from "@/lib/paths";

export type CompanyLeadRow = {
  id: string;
  slug: string;
  title: string;
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
  } | null;
  stage: { name: string; isWon: boolean; isLost: boolean };
};

export function CompanyLeadsTable({ leads }: { leads: CompanyLeadRow[] }) {
  if (leads.length === 0) return null;

  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Lead</TableHeaderCell>
            <TableHeaderCell>Contact</TableHeaderCell>
            <TableHeaderCell>Fase</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>
                <DealLink deal={deal} primary />
              </TableCell>
              <TableCell className="text-fg-muted">
                <ContactLink contact={deal.contact} />
              </TableCell>
              <TableCell>
                <DealStagePill
                  name={deal.stage.name}
                  isWon={deal.stage.isWon}
                  isLost={deal.stage.isLost}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile = (
    <CompactRecordList>
      {leads.map((deal) => (
        <CompactRecordRow
          key={deal.id}
          href={dealPath(deal)}
          title={deal.title}
          status={
            <DealStagePill
              name={deal.stage.name}
              isWon={deal.stage.isWon}
              isLost={deal.stage.isLost}
            />
          }
          meta={
            deal.contact ? (
              <ContactLink contact={deal.contact} />
            ) : undefined
          }
        />
      ))}
    </CompactRecordList>
  );

  return (
    <DetailSection title="Leads">
      <ResponsiveListView desktop={desktop} mobile={mobile} />
    </DetailSection>
  );
}
