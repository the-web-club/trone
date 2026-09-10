import { DealStagePill } from "@/components/deal/deal-stage-pill";
import { DetailSection } from "@/components/detail/detail-layout";
import { DealLink } from "@/components/entity-links";
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

export type ContactLeadRow = {
  id: string;
  slug: string;
  title: string;
  stage: { name: string; isWon: boolean; isLost: boolean };
};

export function ContactLeadsTable({ leads }: { leads: ContactLeadRow[] }) {
  if (leads.length === 0) return null;

  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Lead</TableHeaderCell>
            <TableHeaderCell>Fase</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell>
                <DealLink deal={deal} primary />
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
        <ListCardRow label="Fase">{deal.stage.name}</ListCardRow>
      </ListCardRows>
    </ListCard>
  ));

  return (
    <DetailSection title="Leads">
      <ResponsiveListView desktop={desktop} mobile={mobile} />
    </DetailSection>
  );
}
