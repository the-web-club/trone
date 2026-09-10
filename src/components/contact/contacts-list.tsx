import { CompanyLink, ContactLink } from "@/components/entity-links";
import {
  ListCard,
  ListCardEmpty,
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
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

export type ContactListRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  company: { slug: string; name: string } | null;
};

export function ContactsList({
  items,
  emptyMessage,
  emptyAction,
}: {
  items: ContactListRow[];
  emptyMessage: React.ReactNode;
  emptyAction?: React.ReactNode;
}) {
  const desktop = (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Naam</TableHeaderCell>
            <TableHeaderCell>E-mail</TableHeaderCell>
            <TableHeaderCell>Bedrijf</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={3}>
              {emptyMessage}
              {emptyAction}
            </TableEmptyRow>
          ) : (
            items.map((contact) => (
              <TableRow key={contact.id} interactive>
                <TableCell>
                  <ContactLink contact={contact} primary />
                </TableCell>
                <TableCell className="text-fg-muted">
                  {contact.email || "—"}
                </TableCell>
                <TableCell className="text-fg-muted">
                  <CompanyLink company={contact.company} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const mobile =
    items.length === 0 ? (
      <ListCardEmpty>
        {emptyMessage}
        {emptyAction}
      </ListCardEmpty>
    ) : (
      items.map((contact) => (
        <ListCard key={contact.id}>
          <ListCardHeader>
            <ListCardTitle>
              <ContactLink contact={contact} primary />
            </ListCardTitle>
          </ListCardHeader>
          <ListCardRows>
            <ListCardRow label="E-mail">{contact.email || "—"}</ListCardRow>
            <ListCardRow label="Bedrijf">
              <CompanyLink company={contact.company} />
            </ListCardRow>
          </ListCardRows>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
