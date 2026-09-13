import { ContactOwnerSelect } from "@/components/contact/contact-owner-select";
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
import type { DealTeamMember } from "@/lib/deal-service";

export type ContactListRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  ownerUserId: string | null;
  company: { slug: string; name: string } | null;
};

export function ContactsList({
  items,
  members,
  ownerNames,
  ownerImages,
  emptyMessage,
  emptyAction,
}: {
  items: ContactListRow[];
  members: DealTeamMember[];
  ownerNames: Map<string, string | null | undefined>;
  ownerImages: Map<string, string | null | undefined>;
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
            <TableHeaderCell>Eigenaar</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={4}>
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
                <TableCell>
                  <ContactOwnerSelect
                    contactId={contact.id}
                    ownerUserId={contact.ownerUserId}
                    ownerName={
                      contact.ownerUserId
                        ? (ownerNames.get(contact.ownerUserId) ?? null)
                        : null
                    }
                    ownerImage={
                      contact.ownerUserId
                        ? (ownerImages.get(contact.ownerUserId) ?? null)
                        : null
                    }
                    members={members}
                  />
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
            <ListCardRow label="Eigenaar">
              <ContactOwnerSelect
                contactId={contact.id}
                ownerUserId={contact.ownerUserId}
                ownerName={
                  contact.ownerUserId
                    ? (ownerNames.get(contact.ownerUserId) ?? null)
                    : null
                }
                ownerImage={
                  contact.ownerUserId
                    ? (ownerImages.get(contact.ownerUserId) ?? null)
                    : null
                }
                members={members}
              />
            </ListCardRow>
          </ListCardRows>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
