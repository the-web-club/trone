import "server-only";

import type { Prisma, QuoteStatus } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import { loadPricingContext } from "@/lib/pricing-context";
import { calculatePrice, validateConfiguration } from "@/lib/pricing";
import { nextNumber, SEQ_QUOTE_2026 } from "@/lib/number-sequence-service";
import type { QuoteCatalog } from "@/lib/quote-catalog";
import { resolveDiscountPercent, type QuoteConfigSnapshot } from "@/lib/quote-catalog";
import type { QuoteInput, QuoteItemInput, QuoteStatusInput } from "@/lib/quote-validation";

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

export async function getQuoteComposerData() {
  const prisma = getPrismaClient();
  const [catalog, companies, contacts, deals] = await Promise.all([
    loadQuoteCatalog(),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: { pricing: true },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
    prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, companyId: true },
    }),
  ]);

  return {
    catalog,
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      vatRate: Number(company.vatRate),
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
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function getQuote(id: string) {
  const prisma = getPrismaClient();
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, vatRate: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!quote) {
    throw new AppError("Offerte niet gevonden.", "NOT_FOUND", 404);
  }

  return quote;
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
    if (contact.companyId && contact.companyId !== input.companyId) {
      throw new AppError("Contact hoort niet bij dit bedrijf.", "VALIDATION");
    }
  }

  if (input.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) {
      throw new AppError("Lead niet gevonden.", "NOT_FOUND", 404);
    }
    if (deal.companyId && deal.companyId !== input.companyId) {
      throw new AppError("Lead hoort niet bij dit bedrijf.", "VALIDATION");
    }
  }

  return company;
}

function pricedLine(
  item: QuoteItemInput,
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

export async function createQuote(input: QuoteInput, userId?: string) {
  const company = await assertQuoteRelations(input);
  const prisma = getPrismaClient();
  const ctx = await loadPricingContext(prisma);
  const vatRate = Number(company.vatRate);
  const discounts = company.pricing
    .filter(isPricingActive)
    .map((row) => ({
      productId: row.productId,
      discountPercent: Number(row.discountPercent),
    }));

  for (const item of input.items) {
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
      data: totals,
    });
  });

  return getQuote(quoteId);
}

export async function updateQuote(id: string, input: QuoteInput, userId?: string) {
  const current = await getQuote(id);
  if (current.status !== "DRAFT") {
    throw new AppError("Alleen een conceptofferte kan worden gewijzigd.", "VALIDATION");
  }

  const company = await assertQuoteRelations(input);
  const prisma = getPrismaClient();
  const ctx = await loadPricingContext(prisma);
  const vatRate = Number(company.vatRate);
  const discounts = company.pricing
    .filter(isPricingActive)
    .map((row) => ({
      productId: row.productId,
      discountPercent: Number(row.discountPercent),
    }));

  for (const item of input.items) {
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
      },
    });
  });

  return getQuote(id);
}

export async function updateQuoteStatus(id: string, status: QuoteStatusInput) {
  await getQuote(id);
  const prisma = getPrismaClient();
  return prisma.quote.update({
    where: { id },
    data: { status },
  });
}
