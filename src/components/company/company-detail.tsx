"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteCompanyAction,
  patchCompanyAction,
} from "@/app/(beveiligd)/actions/company-actions";
import { CreateContactDialog } from "@/components/company/contact-form-dialog";
import { DeleteEntityButton } from "@/components/detail/delete-entity-button";
import { VatValidateControls } from "@/components/company/vat-validate-controls";
import { DetailColumns, DetailSection } from "@/components/detail/detail-layout";
import { InlineSelectField } from "@/components/detail/inline-select-field";
import { InlineTextField } from "@/components/detail/inline-text-field";
import { ContactLink } from "@/components/entity-links";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { countrySelectOptions } from "@/lib/countries";
import {
  COMPANY_VAT_RATE_OPTIONS,
  type CompanyPatch,
} from "@/lib/company-validation";
import { companyPath } from "@/lib/paths";
import { resolveVatTreatment, viesStatusFromCache } from "@/lib/vat";
import type { SelectOption } from "@/components/ui/select";

export type CompanyDetailRecord = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  cocNumber: string | null;
  website: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  vatRate: number;
  viesValid: boolean | null;
  viesValidatedAt: string | null;
  viesCheckedName: string | null;
  notes: string | null;
};

export type CompanyDetailContact = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export function CompanyDetail({
  company,
  contacts,
  leads,
  activity,
  isAdmin = false,
}: {
  company: CompanyDetailRecord;
  contacts: CompanyDetailContact[];
  leads: ReactNode;
  activity: ReactNode;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  async function save(patch: CompanyPatch): Promise<string | null> {
    const result = await patchCompanyAction(company.id, patch);
    if (result.error) return result.error;
    if (result.slug && result.slug !== company.slug) {
      router.replace(companyPath({ slug: result.slug }));
    } else {
      router.refresh();
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="page-header">
        <div className="page-header-copy min-w-0 flex-1">
          <InlineTextField
            label="Naam"
            value={company.name}
            variant="title"
            required
            onSave={(name) => save({ name })}
          />
          <div className="page-header-description">
            <Link href="/bedrijven" className="hover:underline">
              Terug naar bedrijven
            </Link>
          </div>
        </div>
        {isAdmin ? (
          <div className="page-actions">
            <DeleteEntityButton
              id={company.id}
              action={deleteCompanyAction}
              title="Bedrijf verwijderen"
              description={`Weet je zeker dat je ${company.name} wilt verwijderen? Contacten en leads blijven bestaan, zonder koppeling naar dit bedrijf. Bedrijven met offertes, orders of facturen kunnen niet worden verwijderd.`}
            />
          </div>
        ) : null}
      </header>

      <DetailColumns
        left={
          <>
            <CompanyDetailFields company={company} save={save} />
            <CompanyContacts companyId={company.id} contacts={contacts} />
            {leads}
          </>
        }
        right={activity}
      />
    </div>
  );
}

function CompanyDetailFields({
  company,
  save,
}: {
  company: CompanyDetailRecord;
  save: (patch: CompanyPatch) => Promise<string | null>;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(company.country);
  const [vatNumber, setVatNumber] = useState(company.vatNumber ?? "");
  const [fromServerCountry, setFromServerCountry] = useState(company.country);
  const [fromServerVatNumber, setFromServerVatNumber] = useState(
    company.vatNumber ?? "",
  );

  if (company.country !== fromServerCountry) {
    setFromServerCountry(company.country);
    setCountry(company.country);
  }
  if ((company.vatNumber ?? "") !== fromServerVatNumber) {
    setFromServerVatNumber(company.vatNumber ?? "");
    setVatNumber(company.vatNumber ?? "");
  }

  const countryItems = useMemo<SelectOption[]>(
    () => countrySelectOptions(),
    [],
  );

  const vatRateItems = useMemo<SelectOption[]>(() => {
    const rates = new Set<number>(COMPANY_VAT_RATE_OPTIONS);
    rates.add(company.vatRate);
    return [...rates]
      .sort((a, b) => a - b)
      .map((rate) => ({ value: String(rate), label: `${rate}%` }));
  }, [company.vatRate]);

  const vies = viesStatusFromCache({
    country,
    vatNumber,
    viesValid: company.viesValid,
    viesValidatedAt: company.viesValidatedAt,
  });
  const treatment = resolveVatTreatment(country, vies.status);

  return (
    <DetailSection title="Gegevens">
      <div className="flex flex-col gap-3">
        <InlineTextField
          label="Naam"
          value={company.name}
          required
          onSave={(name) => save({ name })}
        />
        <InlineTextField
          label="E-mail"
          value={company.email ?? ""}
          type="email"
          onSave={(email) => save({ email: email || null })}
        />
        <InlineTextField
          label="Telefoon"
          value={company.phone ?? ""}
          type="tel"
          onSave={(phone) => save({ phone: phone || null })}
        />
        <div className="flex flex-col gap-2">
          <InlineTextField
            label="Btw-nummer"
            value={company.vatNumber ?? ""}
            inputPlaceholder="Inclusief landcode, bv. FI12345678"
            onSave={async (next) => {
              const error = await save({ vatNumber: next || null });
              if (!error) setVatNumber(next);
              return error;
            }}
          />
          <VatValidateControls
            companyId={company.id}
            vatNumber={vatNumber}
            country={country}
            initialStatus={company.viesValid}
            initialName={company.viesCheckedName}
            initialCheckedAt={company.viesValidatedAt}
            onSuccess={() => router.refresh()}
          />
        </div>
        <InlineTextField
          label="Registratienummer"
          value={company.cocNumber ?? ""}
          inputPlaceholder="KvK, Y-tunnus, Companies House…"
          onSave={(cocNumber) => save({ cocNumber: cocNumber || null })}
        />
        <InlineTextField
          label="Website"
          value={company.website ?? ""}
          onSave={(website) => save({ website: website || null })}
        />
        <InlineTextField
          label="Adres"
          value={company.addressLine ?? ""}
          onSave={(addressLine) => save({ addressLine: addressLine || null })}
        />
        <InlineTextField
          label="Postcode"
          value={company.postalCode ?? ""}
          onSave={(postalCode) => save({ postalCode: postalCode || null })}
        />
        <InlineTextField
          label="Plaats"
          value={company.city ?? ""}
          onSave={(city) => save({ city: city || null })}
        />
        <InlineSelectField
          label="Land"
          value={country}
          items={countryItems}
          searchPlaceholder="Zoek een land…"
          onSave={async (next) => {
            const error = await save({ country: next });
            if (!error) setCountry(next);
            return error;
          }}
        />
        <InlineSelectField
          label="Btw-tarief"
          value={String(company.vatRate)}
          items={vatRateItems}
          searchPlaceholder="Zoek een tarief…"
          onSave={(next) => save({ vatRate: Number(next) })}
        />
        <VatTreatmentNotice
          vatRate={treatment.vatRate}
          vatRegime={treatment.vatRegime}
          warning={treatment.warning}
          stale={vies.stale}
        />
        <p className="text-xs text-fg-muted">
          Offertes en facturen bepalen het tarief via land + VIES, niet via dit
          veld alleen.
        </p>
        <InlineTextField
          label="Notities"
          value={company.notes ?? ""}
          multiline
          onSave={(notes) => save({ notes: notes || null })}
        />
      </div>
    </DetailSection>
  );
}

function CompanyContacts({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: CompanyDetailContact[];
}) {
  return (
    <DetailSection
      title="Contacten"
      action={<CreateContactDialog companyId={companyId} />}
    >
      {contacts.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Nog geen contacten bij dit bedrijf.
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
          {contacts.map((contact) => {
            const meta = [contact.jobTitle, contact.email, contact.phone]
              .filter((value): value is string => Boolean(value?.trim()))
              .join(" · ");
            return (
              <li
                key={contact.id}
                className="flex flex-col gap-0.5 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ContactLink contact={contact} primary />
                  {contact.isPrimary ? (
                    <span className="text-xs text-fg-muted">Primair</span>
                  ) : null}
                </div>
                {meta ? (
                  <p className="text-xs text-fg-muted">{meta}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </DetailSection>
  );
}
