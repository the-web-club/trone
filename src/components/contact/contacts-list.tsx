import { ContactOwnerSelect } from "@/components/contact/contact-owner-select";
import { CompanyLink, ContactLink } from "@/components/entity-links";
import {
  ListCard,
  ListCardContext,
  ListCardControl,
  ListCardEmpty,
  ListCardFooter,
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
import { formatIndustrySector } from "@/lib/classification";
import { joinMeta } from "@/lib/list-copy";
import { formatPersonName } from "@/lib/format";
import { contactPath } from "@/lib/paths";

export type ContactListRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  ownerUserId: string | null;
  company: {
    slug: string;
    name: string;
    industryCode?: string | null;
    sectorCode?: string | null;
  } | null;
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
                  {contact.company &&
                  formatIndustrySector(
                    contact.company.industryCode,
                    contact.company.sectorCode,
                  ) ? (
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {formatIndustrySector(
                        contact.company.industryCode,
                        contact.company.sectorCode,
                      )}
                    </p>
                  ) : null}
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
        <ListCard key={contact.id} interactive>
          <ListCardTitle href={contactPath(contact)}>
            {formatPersonName(contact.firstName, contact.lastName)}
          </ListCardTitle>
          {contact.company ? (
            <ListCardContext>
              {joinMeta([
                contact.company.name,
                formatIndustrySector(
                  contact.company.industryCode,
                  contact.company.sectorCode,
                ),
              ])}
            </ListCardContext>
          ) : null}
          {contact.email ? (
            <ListCardControl>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm break-all text-fg-muted hover:underline"
              >
                {contact.email}
              </a>
            </ListCardControl>
          ) : null}
          <ListCardFooter>
            <ListCardControl className="min-w-0 flex-1">
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
            </ListCardControl>
          </ListCardFooter>
        </ListCard>
      ))
    );

  return <ResponsiveListView desktop={desktop} mobile={mobile} />;
}
