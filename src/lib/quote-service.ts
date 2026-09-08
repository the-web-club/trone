import "server-only";

import type { Prisma, QuoteStatus } from "@/generated/prisma/client";
import {
  endExclusiveOfCalendarDate,
  normalizeDateOnlyInput,
  startOfCalendarDate,
} from "@/lib/date-input";
import { AppError } from "@/lib/errors";
import { createId, isUuid, whereIdOrQuoteNumber } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { paginateArgs } from "@/lib/list-query";
import { loadPricingContext } from "@/lib/pricing-context";
import { calculatePrice, validateConfiguration } from "@/lib/pricing";
import { nextNumber, SEQ_QUOTE_2026 } from "@/lib/number-sequence-service";
import type { QuoteCatalog } from "@/lib/quote-catalog";
import {
  resolveDiscountPercent,
  type CustomQuoteSnapshot,
  type QuoteConfigSnapshot,
} from "@/lib/quote-catalog";
import { assertContactBelongsToCompany } from "@/lib/contact-company";
import { listContactsForSelect } from "@/lib/contact-service";
import { listDealsForSelect, syncDealValueFromQuotes } from "@/lib/deal-service";
import {
  isCustomQuoteItem,
  type ProductQuoteItemInput,
  type QuoteInput,
  type QuoteItemInput,
  type QuoteOutcomeInput,
  type QuoteStatusInput,
} from "@/lib/quote-validation";
import {
  compareVersionLines,
  toQuoteItemInput,
  toQuoteVersionLine,
} from "@/lib/quote-version";
import { logEvent } from "@/lib/timeline-service";
import {
  resolveAndRefreshCompanyVat,
  vatWriteData,
  type FrozenVat,
} from "@/lib/company-vat";

export async function loadQuoteCatalog(): Promise<QuoteCatalog> {
  const prisma = getPrismaClient();
  const [products, options, availability, images] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.productOption.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        values: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.productOptionAvailability.findMany(),
    prisma.productImage.findMany({
      include: { selections: true },
    }),
  ]);

  return {
    products: products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      basePrice: Number(product.basePrice),
    })),
    options: options.map((option) => ({
      id: option.id,
      code: option.code,
      name: option.name,
      inputType: option.inputType === "BOOLEAN" ? "boolean" : "select",
      isRequired: option.isRequired,
      values: option.values.map((value) => ({
        id: value.id,
        optionId: value.optionId,
        value: value.value,
        priceDelta: Number(value.priceDelta),
        priceOnRequest: value.priceOnRequest,
        swatchHex: value.swatchHex,
        swatchImageUrl: value.swatchImageUrl,
      })),
    })),
    availability: availability.map((row) => ({
      productId: row.productId,
      optionId: row.optionId,
      optionValueId: row.optionValueId,
    })),
    images: images.map((image) => ({
      id: image.id,
      productId: image.productId,
      imageUrl: image.imageUrl,
      isDefault: image.isDefault,
      selections: image.selections.map((row) => ({
        optionId: row.optionId,
        optionValueId: row.optionValueId,
      })),
    })),
  };
}

export async function resolveQuoteComposerLinks(input: {
  company?: string;
  deal?: string;
}) {
  const prisma = getPrismaClient();
  let companyId = input.company;
  let dealId = input.deal;

  if (companyId && !isUuid(companyId)) {
    const company = await prisma.company.findUnique({
      where: { slug: companyId },
      select: { id: true },
    });
    companyId = company?.id;
  }

  if (dealId && !isUuid(dealId)) {
    const deal = await prisma.deal.findUnique({
      where: { slug: dealId },
      select: { id: true },
    });
    dealId = deal?.id;
  }

  return { companyId, dealId };
}

export async function getQuoteComposerData(opts?: { companyId?: string }) {
  const prisma = getPrismaClient();
  const companyId = opts?.companyId?.trim() || undefined;
  const [catalog, companies, contacts, deals] = await Promise.all([
    loadQuoteCatalog(),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: { pricing: true },
    }),
    listContactsForSelect(companyId),
    listDealsForSelect(companyId),
  ]);

  return {
    catalog,
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      vatRate: Number(company.vatRate),
      country: company.country,
      vatNumber: company.vatNumber,
      viesValid: company.viesValid,
      viesValidatedAt: company.viesValidatedAt?.toISOString() ?? null,
      discounts: company.pricing
        .filter(isPricingActive)
        .map((row) => ({
          productId: row.productId,
          discountPercent: Number(row.discountPercent),
        })),
    })),
    contacts,
    deals,
  };
}

export async function listQuotes(filters?: { query?: string; status?: QuoteStatus }) {
  const prisma = getPrismaClient();
  const query = filters?.query?.trim();
  return prisma.quote.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { quoteNumber: { contains: query } },
              { company: { name: { contains: query } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, slug: true, name: true } },
      contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
    },
  });
}

export type QuoteListFilters = {
  query?: string;
  status?: QuoteStatus;
  companyId?: string;
  van?: string;
  tot?: string;
  page?: number;
  pageSize?: number;
};

export async function listQuoteRows(filters: QuoteListFilters = {}) {
  const prisma = getPrismaClient();
  const query = filters.query?.trim();
  const { page, pageSize, skip, take } = paginateArgs(
    filters.page,
    filters.pageSize,
  );

  const and: Prisma.QuoteWhereInput[] = [];
  if (filters.status) and.push({ status: filters.status });
  if (filters.companyId) and.push({ companyId: filters.companyId });
  if (query) {
    and.push({
      OR: [
        { quoteNumber: { contains: query } },
        { company: { name: { contains: query } } },
      ],
    });
  }
  const van = normalizeDateOnlyInput(filters.van);
  const tot = normalizeDateOnlyInput(filters.tot);
  if (van || tot) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (van) createdAt.gte = startOfCalendarDate(van);
    if (tot) createdAt.lt = endExclusiveOfCalendarDate(tot);
    and.push({ createdAt });
  }

  const where = and.length ? { AND: and } : {};
  const select = {
    id: true,
    quoteNumber: true,
    currentVersionNumber: true,
    status: true,
    total: true,
    createdAt: true,
    company: { select: { id: true, slug: true, name: true } },
    contact: { select: { id: true, slug: true, firstName: true, lastName: true } },
  } as const;

  const [total, items] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select,
      skip,
      take,
    }),
  ]);

  return { items, total, page, pageSize };
}

const quoteHeaderInclude = {
  company: {
    select: {
      id: true,
      slug: true,
      name: true,
      vatRate: true,
      country: true,
      vatNumber: true,
      cocNumber: true,
      email: true,
      phone: true,
      addressLine: true,
      postalCode: true,
      city: true,
      viesValid: true,
      viesValidatedAt: true,
      viesCheckedName: true,
    },
  },
  contact: {
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      email: true,
      phone: true,
      companyId: true,
    },
  },
  deal: { select: { id: true, slug: true, title: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
};

const quoteVersionInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
};

export async function getQuote(id: string) {
  const prisma = getPrismaClient();
  const quote = await prisma.quote.findUnique({
    where: whereIdOrQuoteNumber(id),
    include: quoteHeaderInclude,
  });

  if (!quote) {
    throw new AppError("Offerte niet gevonden.", "NOT_FOUND", 404);
  }

  return quote;
}

export async function getQuoteWithVersions(id: string) {
  const prisma = getPrismaClient();
  const quote = await prisma.quote.findUnique({
    where: whereIdOrQuoteNumber(id),
    include: {
      ...quoteHeaderInclude,
      versions: {
        orderBy: { versionNumber: "asc" },
        include: quoteVersionInclude,
      },
    },
  });

  if (!quote) {
    throw new AppError("Offerte niet gevonden.", "NOT_FOUND", 404);
  }

  return quote;
}

export async function getVersion(quoteId: string, versionNumber: number) {
  const prisma = getPrismaClient();
  const version = await prisma.quoteVersion.findUnique({
    where: { quoteId_versionNumber: { quoteId, versionNumber } },
    include: {
      ...quoteVersionInclude,
      quote: { select: { id: true, quoteNumber: true } },
    },
  });

  if (!version) {
    throw new AppError("Versie niet gevonden.", "NOT_FOUND", 404);
  }

  return version;
}

export async function compareVersions(
  quoteId: string,
  versionA: number,
  versionB: number,
) {
  if (versionA === versionB) {
    throw new AppError("Kies twee verschillende versies om te vergelijken.", "VALIDATION");
  }

  const [first, second] = await Promise.all([
    getVersion(quoteId, versionA),
    getVersion(quoteId, versionB),
  ]);

  return compareVersionLines(
    first.versionNumber,
    second.versionNumber,
    Number(first.total),
    Number(second.total),
    first.items.map(toQuoteVersionLine),
    second.items.map(toQuoteVersionLine),
  );
}

function isPricingActive(row: {
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  const now = new Date();
  if (row.validFrom && row.validFrom > now) return false;
  if (row.validUntil && row.validUntil < now) return false;
  return true;
}

async function assertQuoteRelations(input: QuoteInput) {
  const prisma = getPrismaClient();
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { pricing: true },
  });
  if (!company) {
    throw new AppError("Bedrijf niet gevonden.", "NOT_FOUND", 404);
  }

  if (input.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) {
      throw new AppError("Contact niet gevonden.", "NOT_FOUND", 404);
    }
    assertContactBelongsToCompany(contact, input.companyId);
  }

  if (input.dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: input.dealId },
      include: { contact: { select: { companyId: true } } },
    });
    if (!deal) {
      throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
    }
    if (deal.companyId && deal.companyId !== input.companyId) {
      throw new AppError("Lead hoort niet bij dit bedrijf.", "VALIDATION");
    }
    if (deal.contact) {
      assertContactBelongsToCompany(deal.contact, input.companyId);
    }
  }

  return company;
}

function pricedLine(
  item: ProductQuoteItemInput,
  ctx: Awaited<ReturnType<typeof loadPricingContext>>,
  vatRate: number,
  discountPercent: number,
) {
  const input = {
    productId: item.productId,
    selections: item.selections,
    quantity: item.quantity,
    vatRate,
    discountPercent,
  };
  const errors = validateConfiguration(input, ctx);
  if (errors.length > 0) {
    throw new AppError(
      errors.map((error) => error.message).join(" "),
      "VALIDATION",
    );
  }

  const price = calculatePrice(input, ctx);
  const product = ctx.products.find((row) => row.id === item.productId);
  const snapshot: QuoteConfigSnapshot = {
    productId: item.productId,
    productSku: product?.sku ?? "",
    productName: price.productName,
    selections: item.selections.map((selection) => {
      const option = ctx.options.find((row) => row.id === selection.optionId);
      const value = ctx.values.find((row) => row.id === selection.optionValueId);
      return {
        optionId: selection.optionId,
        optionCode: option?.code ?? "",
        optionName: option?.name ?? selection.optionId,
        optionValueId: selection.optionValueId,
        value: value?.value ?? selection.optionValueId,
        priceDelta: value?.priceOnRequest ? 0 : (value?.priceDelta ?? 0),
        priceOnRequest: value?.priceOnRequest ?? false,
      };
    }),
    price,
    computedAt: new Date().toISOString(),
  };

  return { price, snapshot, product };
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function persistQuoteItems(
  tx: Prisma.TransactionClient,
  quoteId: string,
  items: QuoteItemInput[],
  ctx: Awaited<ReturnType<typeof loadPricingContext>>,
  vatRate: number,
  discounts: { productId: string | null; discountPercent: number }[],
  userId?: string,
) {
  let subtotal = 0;
  let discountTotal = 0;
  let total = 0;

  for (const [index, item] of items.entries()) {
    if (isCustomQuoteItem(item)) {
      const unitPrice = item.unitPrice == null ? 0 : round2(item.unitPrice);
      const snapshot: CustomQuoteSnapshot = {
        kind: "custom",
        title: item.title.trim(),
        description: item.description.trim(),
        hasPrice: item.unitPrice != null,
      };

      await tx.quoteItem.create({
        data: {
          id: createId(),
          quoteId,
          productId: "",
          configurationId: null,
          description: snapshot.title,
          quantity: 1,
          unitPrice,
          lineDiscountPct: 0,
          lineTotal: unitPrice,
          configSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          sortOrder: index + 1,
        },
      });

      subtotal = round2(subtotal + unitPrice);
      total = round2(total + unitPrice);
      continue;
    }

    const discountPercent = resolveDiscountPercent(discounts, item.productId);
    const { price, snapshot } = pricedLine(item, ctx, vatRate, discountPercent);
    const configurationId = createId();

    await tx.configuration.create({
      data: {
        id: configurationId,
        productId: item.productId,
        label: price.productName,
        basePrice: price.basePrice,
        optionsTotal: price.optionsTotal,
        computedPrice: price.unitNet,
        configSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        createdBy: userId ?? null,
        items: {
          create: snapshot.selections.map((selection) => ({
            id: createId(),
            optionId: selection.optionId,
            optionValueId: selection.optionValueId,
            priceDelta: selection.priceDelta,
          })),
        },
      },
    });

    await tx.quoteItem.create({
      data: {
        id: createId(),
        quoteId,
        productId: item.productId,
        configurationId,
        description: price.productName,
        quantity: price.quantity,
        unitPrice: price.unitNet,
        lineDiscountPct: price.discountPercent,
        lineTotal: price.netTotal,
        configSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        sortOrder: index + 1,
      },
    });

    subtotal = round2(subtotal + price.unitSubtotal * price.quantity);
    discountTotal = round2(discountTotal + price.discountAmount * price.quantity);
    total = round2(total + price.netTotal);
  }

  return { subtotal, discountTotal, total };
}

type CopiedQuoteLine = {
  productId: string;
  configurationId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal | number;
  lineDiscountPct: Prisma.Decimal | number;
  lineTotal: Prisma.Decimal | number;
  configSnapshot: Prisma.JsonValue;
  sortOrder: number;
};

async function replaceVersionItems(
  tx: Prisma.TransactionClient,
  versionId: string,
  items: CopiedQuoteLine[],
) {
  await tx.quoteVersionItem.deleteMany({ where: { quoteVersionId: versionId } });
  for (const item of items) {
    await tx.quoteVersionItem.create({
      data: {
        id: createId(),
        quoteVersionId: versionId,
        productId: item.productId,
        configurationId: item.configurationId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscountPct: item.lineDiscountPct,
        lineTotal: item.lineTotal,
        configSnapshot: item.configSnapshot as Prisma.InputJsonValue,
        sortOrder: item.sortOrder,
      },
    });
  }
}

async function replaceQuoteItemsFromCopy(
  tx: Prisma.TransactionClient,
  quoteId: string,
  items: CopiedQuoteLine[],
) {
  await tx.quoteItem.deleteMany({ where: { quoteId } });
  for (const item of items) {
    await tx.quoteItem.create({
      data: {
        id: createId(),
        quoteId,
        productId: item.productId,
        configurationId: item.configurationId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscountPct: item.lineDiscountPct,
        lineTotal: item.lineTotal,
        configSnapshot: item.configSnapshot as Prisma.InputJsonValue,
        sortOrder: item.sortOrder,
      },
    });
  }
}

async function storedQuoteItems(tx: Prisma.TransactionClient, quoteId: string) {
  return tx.quoteItem.findMany({
    where: { quoteId },
    orderBy: { sortOrder: "asc" },
  });
}

async function resolveQuoteVat(company: {
  id: string;
  country: string;
  vatNumber: string | null;
  viesValid: boolean | null;
  viesValidatedAt: Date | null;
}) {
  const { treatment, frozen } = await resolveAndRefreshCompanyVat(company);
  return { vatRate: treatment.vatRate, frozen };
}

function quoteVatWrite(frozen: FrozenVat) {
  return vatWriteData(frozen);
}

export async function createQuote(input: QuoteInput, userId?: string) {
  const company = await assertQuoteRelations(input);
  const prisma = getPrismaClient();
  const ctx = await loadPricingContext(prisma);
  const { vatRate, frozen } = await resolveQuoteVat(company);
  const discounts = company.pricing
    .filter(isPricingActive)
    .map((row) => ({
      productId: row.productId,
      discountPercent: Number(row.discountPercent),
    }));

  for (const item of input.items) {
    if (isCustomQuoteItem(item)) continue;
    pricedLine(
      item,
      ctx,
      vatRate,
      resolveDiscountPercent(discounts, item.productId),
    );
  }

  const quoteNumber = await nextNumber(prisma, SEQ_QUOTE_2026);
  const quoteId = createId();

  await prisma.$transaction(async (tx) => {
    await tx.quote.create({
      data: {
        id: quoteId,
        quoteNumber,
        companyId: input.companyId,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        status: "DRAFT",
        createdBy: userId ?? null,
      },
    });

    const totals = await persistQuoteItems(
      tx,
      quoteId,
      input.items,
      ctx,
      vatRate,
      discounts,
      userId,
    );

    await tx.quote.update({
      where: { id: quoteId },
      data: { ...totals, ...quoteVatWrite(frozen) },
    });
  });

  await syncDealValueFromQuotes(input.dealId ?? null);
  return getQuote(quoteId);
}

export async function editDraft(id: string, input: QuoteInput, userId?: string) {
  const current = await getQuote(id);
  if (current.status !== "DRAFT") {
    throw new AppError("Alleen een conceptofferte kan worden gewijzigd.", "VALIDATION");
  }

  const company = await assertQuoteRelations(input);
  const prisma = getPrismaClient();
  const ctx = await loadPricingContext(prisma);
  const { vatRate, frozen } = await resolveQuoteVat(company);
  const discounts = company.pricing
    .filter(isPricingActive)
    .map((row) => ({
      productId: row.productId,
      discountPercent: Number(row.discountPercent),
    }));

  for (const item of input.items) {
    if (isCustomQuoteItem(item)) continue;
    pricedLine(
      item,
      ctx,
      vatRate,
      resolveDiscountPercent(discounts, item.productId),
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    const totals = await persistQuoteItems(
      tx,
      id,
      input.items,
      ctx,
      vatRate,
      discounts,
      userId,
    );
    await tx.quote.update({
      where: { id },
      data: {
        companyId: input.companyId,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        ...totals,
        ...quoteVatWrite(frozen),
      },
    });

    const draftVersion = await tx.quoteVersion.findFirst({
      where: { quoteId: id, status: "DRAFT" },
    });
    if (draftVersion) {
      const items = await storedQuoteItems(tx, id);
      await replaceVersionItems(tx, draftVersion.id, items);
      await tx.quoteVersion.update({
        where: { id: draftVersion.id },
        data: { ...totals, ...quoteVatWrite(frozen) },
      });
    }
  });

  await syncDealValueFromQuotes(input.dealId ?? null);
  if (current.dealId && current.dealId !== (input.dealId ?? null)) {
    await syncDealValueFromQuotes(current.dealId);
  }

  return getQuote(id);
}

export async function updateQuote(id: string, input: QuoteInput, userId?: string) {
  return editDraft(id, input, userId);
}

export async function sendQuote(id: string, userId?: string) {
  const current = await getQuote(id);
  if (current.status !== "DRAFT") {
    throw new AppError("Alleen een conceptofferte kan worden verstuurd.", "VALIDATION");
  }
  if (current.items.length === 0) {
    throw new AppError("Voeg minstens één regel toe voor versturen.", "VALIDATION");
  }

  const items = current.items.map((item) => {
    const input = toQuoteItemInput({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      configSnapshot: item.configSnapshot,
    });
    if (!input) {
      throw new AppError(
        "Offerteregel heeft geen geldige configuratie.",
        "VALIDATION",
      );
    }
    return input;
  });

  const company = await assertQuoteRelations({
    companyId: current.companyId,
    contactId: current.contactId ?? undefined,
    dealId: current.dealId ?? undefined,
    items,
  });
  const prisma = getPrismaClient();
  const ctx = await loadPricingContext(prisma);
  const { vatRate, frozen } = await resolveQuoteVat(company);
  const discounts = company.pricing
    .filter(isPricingActive)
    .map((row) => ({
      productId: row.productId,
      discountPercent: Number(row.discountPercent),
    }));

  for (const item of items) {
    if (isCustomQuoteItem(item)) continue;
    pricedLine(
      item,
      ctx,
      vatRate,
      resolveDiscountPercent(discounts, item.productId),
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    const totals = await persistQuoteItems(
      tx,
      id,
      items,
      ctx,
      vatRate,
      discounts,
      userId,
    );
    const stored = await storedQuoteItems(tx, id);
    const versions = await tx.quoteVersion.findMany({
      where: { quoteId: id },
      select: { id: true, versionNumber: true, status: true },
    });
    const draftVersion = versions.find((version) => version.status === "DRAFT");
    const versionNumber =
      draftVersion?.versionNumber ??
      Math.max(0, ...versions.map((version) => version.versionNumber)) + 1;
    const versionId = draftVersion?.id ?? createId();
    const sentAt = new Date();

    if (draftVersion) {
      await replaceVersionItems(tx, versionId, stored);
      await tx.quoteVersion.update({
        where: { id: versionId },
        data: { status: "SENT", sentAt, ...totals, ...quoteVatWrite(frozen) },
      });
    } else {
      await tx.quoteVersion.create({
        data: {
          id: versionId,
          quoteId: id,
          versionNumber,
          status: "SENT",
          sentAt,
          ...totals,
          ...quoteVatWrite(frozen),
        },
      });
      await replaceVersionItems(tx, versionId, stored);
    }

    await tx.quote.update({
      where: { id },
      data: {
        status: "SENT",
        currentVersionId: versionId,
        currentVersionNumber: versionNumber,
        ...totals,
        ...quoteVatWrite(frozen),
      },
    });
  });

  await logEvent({
    type: "QUOTE_SENT",
    body: `Offerte ${current.quoteNumber} verstuurd`,
    userId: userId ?? null,
    quoteId: id,
    dealId: current.dealId,
    contactId: current.contactId,
    companyId: current.companyId,
  });

  return getQuote(id);
}

export async function createRevision(id: string) {
  const quote = await getQuoteWithVersions(id);
  if (
    quote.status !== "SENT" &&
    quote.status !== "REJECTED" &&
    quote.status !== "EXPIRED"
  ) {
    throw new AppError(
      "Een nieuwe versie kan alleen van een verstuurde of afgewezen offerte.",
      "VALIDATION",
    );
  }
  if (quote.versions.some((version) => version.status === "DRAFT")) {
    throw new AppError("Er is al een conceptversie in bewerking.", "VALIDATION");
  }
  if (quote.versions.length === 0) {
    throw new AppError("Deze offerte heeft nog geen vastgelegde versie.", "VALIDATION");
  }

  const last = quote.versions.reduce((latest, version) =>
    version.versionNumber > latest.versionNumber ? version : latest,
  );
  const nextNumber = last.versionNumber + 1;
  const versionId = createId();
  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    await tx.quoteVersion.create({
      data: {
        id: versionId,
        quoteId: id,
        versionNumber: nextNumber,
        status: "DRAFT",
        subtotal: last.subtotal,
        discountTotal: last.discountTotal,
        total: last.total,
        vatRate: last.vatRate,
        vatRegime: last.vatRegime,
        vatNotice: last.vatNotice,
      },
    });
    await replaceVersionItems(tx, versionId, last.items);
    await replaceQuoteItemsFromCopy(tx, id, last.items);
    await tx.quote.update({
      where: { id },
      data: {
        status: "DRAFT",
        subtotal: last.subtotal,
        discountTotal: last.discountTotal,
        total: last.total,
        vatRate: last.vatRate,
        vatRegime: last.vatRegime,
        vatNotice: last.vatNotice,
        currentVersionId: versionId,
        currentVersionNumber: nextNumber,
      },
    });
  });

  return getQuote(id);
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatusInput,
  userId?: string,
) {
  if (status === "DRAFT") {
    throw new AppError(
      "Gebruik een nieuwe versie om opnieuw te bewerken.",
      "VALIDATION",
    );
  }
  if (status === "SENT") {
    throw new AppError(
      "Gebruik versturen om een concept vast te leggen.",
      "VALIDATION",
    );
  }

  const quote = await getQuoteWithVersions(id);
  if (quote.status !== "SENT") {
    throw new AppError(
      "Alleen een verzonden offerte kan worden afgerond.",
      "VALIDATION",
    );
  }

  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id },
      data: { status: status as QuoteOutcomeInput },
    });
    if (quote.currentVersionId) {
      await tx.quoteVersion.update({
        where: { id: quote.currentVersionId },
        data: { status: status as QuoteOutcomeInput },
      });
    } else if (quote.currentVersionNumber > 0) {
      await tx.quoteVersion.update({
        where: {
          quoteId_versionNumber: {
            quoteId: id,
            versionNumber: quote.currentVersionNumber,
          },
        },
        data: { status: status as QuoteOutcomeInput },
      });
    }
  });

  if (status === "ACCEPTED") {
    await logEvent({
      type: "QUOTE_ACCEPTED",
      body: `Offerte ${quote.quoteNumber} geaccepteerd`,
      userId: userId ?? null,
      quoteId: id,
      dealId: quote.dealId,
      contactId: quote.contactId,
      companyId: quote.companyId,
    });
  }

  await syncDealValueFromQuotes(quote.dealId);
  return getQuote(id);
}
