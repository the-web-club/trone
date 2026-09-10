import { DealStagePill } from "@/components/deal/deal-stage-pill";
import { DetailSection } from "@/components/detail/detail-layout";
import { ContactLink, DealLink } from "@/components/entity-links";
import {
  ListCard,
  ListCardHeader,
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
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

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

  const mobile = leads.map((deal) => (
    <ListCard key={deal.id}>
      <ListCardHeader>
        <ListCardTitle>
          <DealLink deal={deal} primary />
        </ListCardTitle>
        <DealStagePill
          name={deal.stage.name}
          isWon={deal.stage.isWon}
          isLost={deal.stage.isLost}
        />
      </ListCardHeader>
      <ListCardRows>
        <ListCardRow label="Contact">
          <ContactLink contact={deal.contact} />
        </ListCardRow>
      </ListCardRows>
    </ListCard>
  ));

  return (
    <DetailSection title="Leads">
      <ResponsiveListView desktop={desktop} mobile={mobile} />
    </DetailSection>
  );
}
