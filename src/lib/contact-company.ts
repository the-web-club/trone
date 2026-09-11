import { AppError } from "@/lib/errors";

/**
 * Contact → bedrijf is nu 1:1 via `Contact.companyId`.
 * Uitbreidpunt voor later many-to-many: wijzig alleen deze module
 * (en `listContactsForSelect` in contact-service). Zie docs/DATA-MODEL.md.
 */
export type ContactCompanyRef = {
  companyId?: string | null;
};

export function normalizeCompanyId(
  companyId: string | null | undefined,
): string | null {
  const trimmed = companyId?.trim();
  return trimmed ? trimmed : null;
}

export function getContactCompanyId(
  contact: ContactCompanyRef | null | undefined,
): string | null {
  return normalizeCompanyId(contact?.companyId);
}

export function getContactCompany(
  contact: ContactCompanyRef | null | undefined,
): { id: string } | null {
  const id = getContactCompanyId(contact);
  return id ? { id } : null;
}

export function contactBelongsToCompany(
  contact: ContactCompanyRef | null | undefined,
  companyId: string | null | undefined,
): boolean {
  return getContactCompanyId(contact) === normalizeCompanyId(companyId);
}

export function assertContactBelongsToCompany(
  contact: ContactCompanyRef,
  companyId: string | null | undefined,
): void {
  if (contactBelongsToCompany(contact, companyId)) return;
  throw new AppError(
    "Dit contact hoort niet bij het gekozen bedrijf. Kies een contact van dat bedrijf of wijzig het bedrijf.",
    "VALIDATION",
  );
}
