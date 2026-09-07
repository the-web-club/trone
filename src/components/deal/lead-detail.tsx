"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { patchDealAction } from "@/app/(beveiligd)/actions/deal-actions";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import {
  COMPANY_SWITCH_WARNING,
  useCompanyContactFields,
} from "@/components/contact/use-company-contact-fields";
import { DealHotToggle } from "@/components/deal/deal-hot-toggle";
import { DetailColumns, DetailSection } from "@/components/detail/detail-layout";
import {
  INLINE_SELECT_EMPTY,
  InlineSelectField,
} from "@/components/detail/inline-select-field";
import { InlineTextField } from "@/components/detail/inline-text-field";
import { CompanyLink, ContactLink } from "@/components/entity-links";
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

export function LeadDetail({
  deal,
  stages,
  sources,
  companies,
  contacts,
  quotes,
  activity,
}: {
  deal: LeadDetailRecord;
  stages: LeadDetailStage[];
  sources: LeadDetailOption[];
  companies: LeadDetailCompany[];
  contacts: LeadDetailContact[];
  quotes: ReactNode;
  activity: ReactNode;
}) {
  const router = useRouter();
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
  const stage =
    stages.find((item) => item.id === deal.stageId) ?? deal.stage;

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
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <InlineTextField
                label="Titel"
                value={deal.title}
                variant="title"
                required
                onSave={(title) => save({ title })}
              />
            </div>
            <InlineSelectField
              label="Fase"
              value={deal.stageId}
              items={stageItems}
              hideLabel
              compact
              triggerClassName={cn(
                "h-5 w-auto min-w-0 max-w-[14rem] rounded-sm border-transparent px-1.5 text-xs font-medium",
                stageToneClass,
              )}
              searchPlaceholder="Zoek een fase…"
              onSave={(stageId) => save({ stageId })}
            />
          </div>
          <div className="page-header-description">
            <Link href="/leads" className="hover:underline">
              Terug naar de pijplijn
            </Link>
            {company ? (
              <>
                {" · "}
                <CompanyLink company={company} />
              </>
            ) : null}
            {contact?.slug ? (
              <>
                {" · "}
                <ContactLink
                  contact={{
                    slug: contact.slug,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
        <div className="page-actions">
          <DealHotToggle dealId={deal.id} isHot={deal.isHot} />
          <Link
            href={newQuotePath({ deal, company })}
            className={pageActionPrimaryClassName()}
          >
            Nieuwe offerte
          </Link>
        </div>
      </header>

      <DetailColumns
        left={
          <>
            <DetailSection title="Gegevens">
              <div className="flex flex-col gap-3">
                <InlineSelectField
                  label="Bedrijf"
                  value={relation.companyId}
                  items={companyItems}
                  searchPlaceholder="Zoek een bedrijf…"
                  createLabel="Nieuw bedrijf"
                  onCreate={(query) => {
                    setCompanyQuery(query);
                    setCompanyDialogOpen(true);
                  }}
                  onSave={saveCompany}
                />
                <InlineSelectField
                  label="Contactpersoon"
                  value={relation.contactId}
                  items={contactItems}
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
                <InlineSelectField
                  label="Bron"
                  value={deal.sourceId ?? ""}
                  items={sourceItems}
                  searchPlaceholder="Zoek een bron…"
                  onSave={(sourceId) => save({ sourceId: sourceId || null })}
                />
                <InlineTextField
                  label="Geschatte waarde"
                  value={
                    deal.valueEstimate == null ? "" : String(deal.valueEstimate)
                  }
                  displayValue={deal.valueEstimateLabel}
                  type="number"
                  min={0}
                  step={1}
                  onSave={async (next) => {
                    if (next === "") return save({ valueEstimate: null });
                    const parsed = Number(next);
                    if (Number.isNaN(parsed) || parsed < 0) {
                      return "Geschatte waarde moet 0 of hoger zijn";
                    }
                    return save({ valueEstimate: parsed });
                  }}
                />
              </div>
            </DetailSection>
            {quotes}
          </>
        }
        right={activity}
      />
    </div>
  );
}
