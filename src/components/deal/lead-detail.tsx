"use client";

import { type ReactNode, Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteDealAction,
  patchDealAction,
} from "@/app/(beveiligd)/actions/deal-actions";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { DetailActionMenu, detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
import { Button } from "@/components/ui/button";
import { DeleteEntityButton } from "@/components/detail/delete-entity-button";
import {
  COMPANY_SWITCH_WARNING,
  useCompanyContactFields,
} from "@/components/contact/use-company-contact-fields";
import { DealHotToggle } from "@/components/deal/deal-hot-toggle";
import {
  DetailBackLink,
  DetailColumns,
  DetailFieldGrid,
  DetailHeader,
  DetailPage,
  DetailValueField,
} from "@/components/detail/detail-layout";
import { LeadFieldsSkeleton } from "@/components/detail/detail-skeletons";
import {
  INLINE_SELECT_EMPTY,
  InlineSelectField,
} from "@/components/detail/inline-select-field";
import { InlineTextField } from "@/components/detail/inline-text-field";
import { CreateQuoteContactDialog } from "@/components/quote/create-contact-dialog";
import { pageActionPrimaryClassName } from "@/components/shell/page-header";
import { cn } from "@/lib/cn";
import { contactBelongsToCompany } from "@/lib/contact-company";
import type { DealPatch } from "@/lib/deal-validation";
import { formatPersonName } from "@/lib/format";
import { dealPath, newQuotePath } from "@/lib/paths";
import type { SelectOption } from "@/components/ui/select";

export type LeadDetailRecord = {
  id: string;
  slug: string;
  title: string;
  isHot: boolean;
  companyId: string | null;
  contactId: string | null;
  stageId: string;
  sourceId: string | null;
  valueEstimate: number | null;
  valueEstimateLabel: string;
  quotedTotal: number | null;
  company: { id: string; slug: string; name: string } | null;
  contact: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
    companyId: string | null;
  } | null;
  stage: { id: string; name: string; isWon: boolean; isLost: boolean };
};

export type LeadDetailOption = { id: string; name: string };

export type LeadDetailStage = LeadDetailOption & {
  isWon: boolean;
  isLost: boolean;
};

export type LeadDetailCompany = {
  id: string;
  slug: string;
  name: string;
};

export type LeadDetailContact = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

export type LeadRelationOptions = {
  sources: LeadDetailOption[];
  companies: LeadDetailCompany[];
  contacts: LeadDetailContact[];
};

export function LeadDetail({
  deal,
  stages,
  relationOptions,
  quotes,
  activity,
  isAdmin = false,
}: {
  deal: LeadDetailRecord;
  stages: LeadDetailStage[];
  relationOptions: Promise<LeadRelationOptions>;
  quotes: ReactNode;
  activity: ReactNode;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const company = deal.company;
  const stage =
    stages.find((item) => item.id === deal.stageId) ?? deal.stage;

  const stageItems = useMemo<SelectOption[]>(
    () => stages.map((item) => ({ value: item.id, label: item.name })),
    [stages],
  );

  const stageToneClass = stage.isWon
    ? "bg-success-bg text-success hover:bg-success-bg hover:text-success"
    : stage.isLost
      ? "bg-danger-bg text-danger hover:bg-danger-bg hover:text-danger"
      : "bg-info-bg text-info hover:bg-info-bg hover:text-info";

  async function save(patch: DealPatch): Promise<string | null> {
    const result = await patchDealAction(deal.id, patch);
    if (result.error) return result.error;
    if (result.slug && result.slug !== deal.slug) {
      router.replace(dealPath({ slug: result.slug }));
    } else {
      router.refresh();
    }
    return null;
  }

  const primaryQuoteAction = (
    <Link
      href={newQuotePath({ deal, company })}
      className={cn(
        pageActionPrimaryClassName(),
        "detail-action-primary w-full sm:w-auto",
      )}
    >
      Nieuwe offerte
    </Link>
  );

  const moreActions = (
    <>
      <DetailActionMenu>
        <DealHotToggle dealId={deal.id} isHot={deal.isHot} presentation="menu" />
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
      {isAdmin ? (
        <DeleteEntityButton
          id={deal.id}
          action={deleteDealAction}
          title="Lead verwijderen"
          description={`Weet je zeker dat je ${deal.title} wilt verwijderen? Offertes en orders blijven bestaan, zonder koppeling naar deze lead.`}
          presentation="hidden"
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </>
  );

  return (
    <DetailPage>
      <DetailHeader
        back={<DetailBackLink href="/leads">Leads</DetailBackLink>}
        title={
          <InlineTextField
            label="Titel"
            value={deal.title}
            variant="title"
            required
            onSave={(title) => save({ title })}
          />
        }
        status={
          <InlineSelectField
            label="Fase"
            value={deal.stageId}
            items={stageItems}
            hideLabel
            compact
            triggerClassName={cn(
              "h-6 w-auto min-w-0 max-w-[14rem] rounded-sm border-transparent px-2 text-xs font-medium",
              stageToneClass,
            )}
            searchPlaceholder="Zoek een fase…"
            onSave={(stageId) => save({ stageId })}
          />
        }
        actions={
          <>
            {primaryQuoteAction}
            {moreActions}
          </>
        }
      />

      <DetailColumns
        left={
          <>
            <Suspense fallback={<LeadFieldsSkeleton />}>
              <LeadDetailFields
                deal={deal}
                relationOptions={relationOptions}
                save={save}
              />
            </Suspense>
            {quotes}
          </>
        }
        right={activity}
      />
    </DetailPage>
  );
}

function LeadDetailFields({
  deal,
  relationOptions,
  save,
}: {
  deal: LeadDetailRecord;
  relationOptions: Promise<LeadRelationOptions>;
  save: (patch: DealPatch) => Promise<string | null>;
}) {
  const { sources, companies, contacts } = use(relationOptions);
  const relation = useCompanyContactFields({
    initialCompanyId: deal.companyId,
    initialContactId: deal.contactId,
    initialContacts: contacts,
  });
  const [extraCompanies, setExtraCompanies] = useState<LeadDetailCompany[]>(
    [],
  );
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");

  const companyList = useMemo(() => {
    const merged = [...companies];
    for (const extra of extraCompanies) {
      if (!merged.some((item) => item.id === extra.id)) merged.push(extra);
    }
    return merged;
  }, [companies, extraCompanies]);

  const company =
    companyList.find((item) => item.id === relation.companyId) ??
    (deal.company?.id === relation.companyId ? deal.company : null);
  const contact =
    relation.contacts.find((item) => item.id === relation.contactId) ??
    (deal.contact?.id === relation.contactId ? deal.contact : null);

  const companyItems = useMemo<SelectOption[]>(() => {
    const items: SelectOption[] = [
      { value: INLINE_SELECT_EMPTY, label: "Geen bedrijf gekoppeld" },
      ...companyList.map((item) => ({ value: item.id, label: item.name })),
    ];
    if (company && !items.some((item) => item.value === company.id)) {
      items.splice(1, 0, { value: company.id, label: company.name });
    }
    return items;
  }, [companyList, company]);

  const contactItems = useMemo<SelectOption[]>(() => {
    const items: SelectOption[] = [
      { value: INLINE_SELECT_EMPTY, label: "Geen contactpersoon" },
      ...relation.contacts.map((item) => ({
        value: item.id,
        label: formatPersonName(item.firstName, item.lastName),
      })),
    ];
    if (contact && !items.some((item) => item.value === contact.id)) {
      items.splice(1, 0, {
        value: contact.id,
        label: formatPersonName(contact.firstName, contact.lastName),
      });
    }
    return items;
  }, [relation.contacts, contact]);

  const sourceItems = useMemo<SelectOption[]>(
    () => [
      { value: INLINE_SELECT_EMPTY, label: "Onbekend" },
      ...sources.map((item) => ({ value: item.id, label: item.name })),
    ],
    [sources],
  );

  async function saveCompany(nextId: string): Promise<string | false | null> {
    const selected = relation.contacts.find(
      (item) => item.id === relation.contactId,
    );
    let nextContactId = relation.contactId;
    if (
      relation.contactId &&
      selected &&
      nextId &&
      !contactBelongsToCompany(selected, nextId)
    ) {
      if (!window.confirm(COMPANY_SWITCH_WARNING)) return false;
      nextContactId = "";
    }

    const error = await save({
      companyId: nextId || null,
      contactId: nextContactId || null,
    });
    if (error) return error;
    relation.applySelection({
      companyId: nextId,
      contactId: nextContactId,
    });
    return null;
  }

  async function saveContact(nextId: string): Promise<string | null> {
    const selected = relation.contacts.find((item) => item.id === nextId);
    const nextCompanyId = selected?.companyId
      ? selected.companyId
      : relation.companyId;
    const error = await save({
      contactId: nextId || null,
      companyId: nextCompanyId || null,
    });
    if (error) return error;
    relation.applySelection({
      companyId: nextCompanyId,
      contactId: nextId,
    });
    return null;
  }

  async function handleCreatedCompany(created: LeadDetailCompany) {
    setExtraCompanies((list) =>
      list.some((item) => item.id === created.id) ? list : [...list, created],
    );
    await saveCompany(created.id);
  }

  async function handleCreatedContact(created: {
    id: string;
    slug?: string;
    firstName: string;
    lastName: string | null;
    companyId: string | null;
  }) {
    const nextCompanyId = created.companyId ?? relation.companyId;
    relation.applySelection(
      { companyId: nextCompanyId, contactId: created.id },
      {
        contacts: [
          ...relation.contacts,
          {
            id: created.id,
            slug: created.slug,
            firstName: created.firstName,
            lastName: created.lastName,
            companyId: created.companyId,
          },
        ],
      },
    );
    await save({
      contactId: created.id,
      companyId: nextCompanyId || null,
    });
  }

  return (
    <>
      <DetailFieldGrid>
        <InlineSelectField
          label="Bedrijf"
          value={relation.companyId}
          items={companyItems}
          layout="row"
          searchPlaceholder="Zoek een bedrijf…"
          createLabel="Nieuw bedrijf"
          onCreate={(query) => {
            setCompanyQuery(query);
            setCompanyDialogOpen(true);
          }}
          onSave={saveCompany}
        />
        <InlineSelectField
          label="Contact"
          value={relation.contactId}
          items={contactItems}
          layout="row"
          searchPlaceholder="Zoek een contact…"
          createLabel="Nieuw contact"
          createDisabled={!relation.companyId}
          disabled={relation.contactsLoading}
          onCreate={(query) => {
            if (!relation.companyId) return;
            setContactQuery(query);
            setContactDialogOpen(true);
          }}
          onSave={saveContact}
        />
        <InlineSelectField
          label="Bron"
          value={deal.sourceId ?? ""}
          items={sourceItems}
          layout="row"
          searchPlaceholder="Zoek een bron…"
          onSave={(sourceId) => save({ sourceId: sourceId || null })}
        />
        {deal.quotedTotal == null ? (
          <InlineTextField
            label="Waarde"
            value={
              deal.valueEstimate == null ? "" : String(deal.valueEstimate)
            }
            displayValue={deal.valueEstimateLabel}
            type="number"
            min={0}
            step={1}
            layout="row"
            onSave={async (next) => {
              if (next === "") return save({ valueEstimate: null });
              const parsed = Number(next);
              if (Number.isNaN(parsed) || parsed < 0) {
                return "Geschatte waarde moet 0 of hoger zijn";
              }
              return save({ valueEstimate: parsed });
            }}
          />
        ) : (
          <DetailValueField label="Waarde">
            {deal.valueEstimateLabel}
          </DetailValueField>
        )}
      </DetailFieldGrid>
      <CreateCompanyDialog
        showTrigger={false}
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        defaultName={companyQuery}
        onCreated={handleCreatedCompany}
      />
      <CreateQuoteContactDialog
        companyId={relation.companyId}
        showTrigger={false}
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        defaultFirstName={contactQuery}
        onCreated={handleCreatedContact}
      />
    </>
  );
}
