import "server-only";

import { getPrismaClient } from "@/lib/db";
import {
  frozenVatFromTreatment,
  resolveVatTreatment,
  shouldRefreshVies,
  viesStatusFromCache,
  type FrozenVat,
  type VatTreatment,
  type ViesStatus,
} from "@/lib/vat";
import {
  checkViesVatNumber,
  type ViesCheckResult,
} from "@/lib/vies-service";

export type { FrozenVat };

export type CompanyVatSource = {
  id: string;
  country: string;
  vatNumber: string | null;
  viesValid: boolean | null;
  viesValidatedAt: Date | null;
};

export function vatWriteData(frozen: FrozenVat) {
  return {
    vatRate: frozen.vatRate,
    vatRegime: frozen.vatRegime,
    vatNotice: frozen.vatNotice,
  };
}

export async function persistViesResult(
  companyId: string,
  data: {
    vatNumber?: string | null;
    result: ViesCheckResult;
  },
) {
  if (data.result.status !== "GELDIG" && data.result.status !== "ONGELDIG") {
    return;
  }
  const prisma = getPrismaClient();
  await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(data.vatNumber !== undefined ? { vatNumber: data.vatNumber } : {}),
      viesValid: data.result.status === "GELDIG",
      viesValidatedAt: new Date(),
      viesCheckedName: data.result.name,
    },
  });
}

export async function resolveAndRefreshCompanyVat(
  company: CompanyVatSource,
  options?: { forceRefresh?: boolean },
): Promise<{
  treatment: VatTreatment;
  frozen: FrozenVat;
  viesStatus: ViesStatus;
  refreshed: boolean;
}> {
  let viesStatus = viesStatusFromCache(company).status;
  let refreshed = false;

  if (
    shouldRefreshVies({
      country: company.country,
      vatNumber: company.vatNumber,
      viesValidatedAt: company.viesValidatedAt,
      force: options?.forceRefresh,
    })
  ) {
    const result = await checkViesVatNumber(company.vatNumber, {
      fallbackCountry: company.country,
    });
    viesStatus = result.status;
    refreshed = true;
    await persistViesResult(company.id, {
      vatNumber: company.vatNumber,
      result,
    });
  }

  const treatment = resolveVatTreatment(company.country, viesStatus);
  return {
    treatment,
    frozen: frozenVatFromTreatment(treatment),
    viesStatus,
    refreshed,
  };
}

export function frozenVatFromDocument(doc: {
  vatRate?: { toString(): string } | number | null;
  vatRegime?: FrozenVat["vatRegime"] | null;
  vatNotice?: string | null;
}): FrozenVat | null {
  if (doc.vatRegime == null || doc.vatRate == null) return null;
  return {
    vatRate: Number(doc.vatRate),
    vatRegime: doc.vatRegime,
    vatNotice: doc.vatNotice ?? null,
  };
}
