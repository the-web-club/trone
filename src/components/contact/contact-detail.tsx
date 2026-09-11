"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteContactAction,
  patchContactAction,
} from "@/app/(beveiligd)/actions/contact-actions";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { ContactNameTitle } from "@/components/contact/contact-name-title";
import { ContactPrimaryToggle } from "@/components/contact/contact-primary-toggle";
import { DetailActionMenu, detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
import { Button } from "@/components/ui/button";
import { DeleteEntityButton } from "@/components/detail/delete-entity-button";
import {
  DetailBackLink,
  DetailColumns,
  DetailFieldGrid,
  DetailHeader,
  DetailPage,
  DetailSection,
} from "@/components/detail/detail-layout";
import {
  INLINE_SELECT_EMPTY,
  InlineSelectField,
} from "@/components/detail/inline-select-field";
import { InlineTextField } from "@/components/detail/inline-text-field";
import type { SelectOption } from "@/components/ui/select";
import type { ContactPatch } from "@/lib/contact-validation";
import { formatPersonName } from "@/lib/format";
import { contactPath } from "@/lib/paths";

export type ContactDetailRecord = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isPrimary: boolean;
  company: { id: string; slug: string; name: string } | null;
};

export function ContactDetail({
  contact,
  companies,
  leads,
  activity,
  isAdmin = false,
}: {
  contact: ContactDetailRecord;
  companies: Array<{ id: string; slug: string; name: string }>;
  leads: ReactNode;
  activity: ReactNode;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const name = formatPersonName(contact.firstName, contact.lastName);

  async function save(patch: ContactPatch): Promise<string | null> {
    const result = await patchContactAction(contact.id, patch);
    if (result.error) return result.error;
    if (result.slug && result.slug !== contact.slug) {
      router.replace(contactPath({ slug: result.slug }));
    } else {
      router.refresh();
    }
    return null;
  }

  return (
    <DetailPage>
      <DetailHeader
        back={<DetailBackLink href="/contacten">Contacten</DetailBackLink>}
        title={
          <ContactNameTitle
            firstName={contact.firstName}
            lastName={contact.lastName ?? ""}
            onSave={({ firstName, lastName }) =>
              save({ firstName, lastName: lastName || null })
            }
          />
        }
        status={
          contact.isPrimary ? (
            <span className="inline-flex h-6 items-center rounded-sm bg-info-bg px-2 text-xs font-medium text-info">
              Primair
            </span>
          ) : null
        }
        actions={
          <>
            {contact.company || isAdmin ? (
              <DetailActionMenu>
                {contact.company ? (
                  <ContactPrimaryToggle
                    isPrimary={contact.isPrimary}
                    onSave={(isPrimary) => save({ isPrimary })}
                    presentation="menu"
                  />
                ) : null}
                {isAdmin ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={detailMenuButtonClassName(true)}
                    onClick={() => setDeleteOpen(true)}
                  >
                    Verwijderen
                  </Button>
                ) : null}
              </DetailActionMenu>
            ) : null}
            {isAdmin ? (
              <DeleteEntityButton
                id={contact.id}
                action={deleteContactAction}
                title="Contact verwijderen"
                description={`Weet je zeker dat je ${name} wilt verwijderen? Leads, offertes en orders blijven bestaan, zonder koppeling naar dit contact.`}
                presentation="hidden"
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
              />
            ) : null}
          </>
        }
      />

      <DetailColumns
        left={
          <>
            <ContactDetailFields
              contact={contact}
              companies={companies}
              save={save}
            />
            {leads}
          </>
        }
        right={activity}
      />
    </DetailPage>
  );
}

function ContactDetailFields({
  contact,
  companies,
  save,
}: {
  contact: ContactDetailRecord;
  companies: Array<{ id: string; slug: string; name: string }>;
  save: (patch: ContactPatch) => Promise<string | null>;
}) {
  const [companyList, setCompanyList] = useState(companies);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");

  const companyItems = useMemo<SelectOption[]>(() => {
    const items: SelectOption[] = [
      { value: INLINE_SELECT_EMPTY, label: "Geen bedrijf gekoppeld" },
      ...companyList.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    ];
    if (
      contact.company &&
      !items.some((item) => item.value === contact.company?.id)
    ) {
      items.splice(1, 0, {
        value: contact.company.id,
        label: contact.company.name,
      });
    }
    return items;
  }, [companyList, contact.company]);

  return (
    <>
      <DetailSection title="Gegevens">
        <DetailFieldGrid>
          <InlineTextField
            label="Functie"
            value={contact.jobTitle ?? ""}
            layout="row"
            onSave={(jobTitle) => save({ jobTitle: jobTitle || null })}
          />
          <InlineTextField
            label="E-mail"
            value={contact.email ?? ""}
            type="email"
            layout="row"
            onSave={(email) => save({ email: email || null })}
          />
          <InlineTextField
            label="Telefoon"
            value={contact.phone ?? ""}
            type="tel"
            layout="row"
            onSave={(phone) => save({ phone: phone || null })}
          />
          <InlineSelectField
            label="Bedrijf"
            value={contact.company?.id ?? ""}
            items={companyItems}
            layout="row"
            searchPlaceholder="Zoek een bedrijf…"
            createLabel="Nieuw bedrijf"
            onCreate={(query) => {
              setCompanyQuery(query);
              setCompanyDialogOpen(true);
            }}
            onSave={(companyId) => save({ companyId: companyId || null })}
          />
        </DetailFieldGrid>
      </DetailSection>
      <CreateCompanyDialog
        showTrigger={false}
        open={companyDialogOpen}
        onOpenChange={(next) => {
          setCompanyDialogOpen(next);
          if (!next) setCompanyQuery("");
        }}
        defaultName={companyQuery}
        onCreated={async (created) => {
          setCompanyList((list) =>
            list.some((row) => row.id === created.id)
              ? list
              : [...list, created].sort((a, b) =>
                  a.name.localeCompare(b.name, "nl"),
                ),
          );
          await save({ companyId: created.id });
        }}
      />

      <DetailSection
        title="Notities"
        collapsible
        defaultOpen={Boolean(contact.notes)}
      >
        <InlineTextField
          label="Notities"
          value={contact.notes ?? ""}
          multiline
          onSave={(notes) => save({ notes: notes || null })}
        />
      </DetailSection>
    </>
  );
}
