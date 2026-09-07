import { DealStagePill } from "@/components/deal/deal-stage-pill";
import { DetailSection } from "@/components/detail/detail-layout";
import { DealLink } from "@/components/entity-links";
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

  return (
    <DetailSection title="Leads">
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
    </DetailSection>
  );
}
