"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { parseComposerCompanyForm } from "@/lib/company-validation";
import { createCompany } from "@/lib/company-service";
import { parseOptionalComposerContactForm } from "@/lib/contact-validation";
import { createContact } from "@/lib/contact-service";
import {
  createDeal,
  listDealStages,
  listLeadSources,
} from "@/lib/deal-service";
import { toActionError } from "@/lib/errors";
import { companyPath, contactPath, dealPath } from "@/lib/paths";

export type ComposerCreatedCompany = {
  id: string;
  name: string;
  vatRate: number;
  discounts: { productId: string | null; discountPercent: number }[];
};

export type ComposerCreatedContact = {
  id: string;
  slug?: string;
  firstName: string;
  lastName: string | null;
  companyId: string | null;
};

export type ComposerCreatedDeal = {
  id: string;
  title: string;
  companyId: string | null;
};

export type CreateComposerCustomerResult =
  | { error: string }
  | {
      company: ComposerCreatedCompany;
      contact: ComposerCreatedContact | null;
      deal: ComposerCreatedDeal | null;
    };

function wantsLead(formData: FormData): boolean {
  const value = formData.get("createLead");
  return value === "on" || value === "true" || value === "1";
}

export async function createComposerCustomerAction(
  formData: FormData,
): Promise<CreateComposerCustomerResult> {
  try {
    const session = await requireSession();
    const companyInput = parseComposerCompanyForm(formData);
    const contactInput = parseOptionalComposerContactForm(formData);
    const company = await createCompany(companyInput, session.user.id);

    let contact: ComposerCreatedContact | null = null;
    let contactSlug: string | null = null;
    if (contactInput) {
      const saved = await createContact(company.id, contactInput);
      contactSlug = saved.slug;
      contact = {
        id: saved.id,
        slug: saved.slug,
        firstName: saved.firstName,
        lastName: saved.lastName,
        companyId: saved.companyId,
      };
    }

    let deal: ComposerCreatedDeal | null = null;
    let dealSlug: string | null = null;
    if (wantsLead(formData)) {
      const [stages, sources] = await Promise.all([
        listDealStages(),
        listLeadSources(),
      ]);
      const stage =
        stages.find((row) => !row.isWon && !row.isLost) ?? stages[0];
      const source = sources.find((row) => row.name === "Telefonisch");
      if (stage) {
        const saved = await createDeal(
          {
            title: company.name,
            companyId: company.id,
            contactId: contact?.id,
            stageId: stage.id,
            sourceId: source?.id,
          },
          session.user.id,
        );
        dealSlug = saved.slug;
        deal = {
          id: saved.id,
          title: saved.title,
          companyId: saved.companyId,
        };
      }
    }

    revalidatePath("/bedrijven");
    revalidatePath("/bedrijven/[slug]", "page");
    revalidatePath("/contacten");
    revalidatePath("/leads");
    revalidatePath("/overzicht");
    revalidatePath(companyPath(company));
    if (contactSlug) revalidatePath(contactPath({ slug: contactSlug }));
    if (dealSlug) revalidatePath(dealPath({ slug: dealSlug }));

    return {
      company: {
        id: company.id,
        name: company.name,
        vatRate: Number(company.vatRate),
        discounts: [],
      },
      contact,
      deal,
    };
  } catch (error) {
    return toActionError(error);
  }
}
