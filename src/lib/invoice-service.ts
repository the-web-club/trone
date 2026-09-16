import "server-only";

import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { getPrismaClient } from "@/lib/db";
import { createId } from "@/lib/id";
import {
  frozenVatFromDocument,
  resolveAndRefreshCompanyVat,
  vatWriteData,
} from "@/lib/company-vat";
import { nextNumber, SEQ_INVOICE_2026 } from "@/lib/number-sequence-service";
import { getOrder } from "@/lib/order-service";
import { vatOnNet } from "@/lib/pricing";

async function ensureInvoiceSequence() {
  const prisma = getPrismaClient();
  const existing = await prisma.numberSequence.findUnique({
    where: { seqKey: SEQ_INVOICE_2026 },
  });
  if (existing) return;
  await prisma.numberSequence.create({
    data: {
      id: createId(),
      seqKey: SEQ_INVOICE_2026,
      prefix: "F2026",
      year: 2026,
      lastNumber: 0,
      padding: 5,
    },
  });
}

export async function createInvoiceFromOrder(orderId: string) {
  const order = await getOrder(orderId);
  const frozen =
    frozenVatFromDocument(order) ??
    (
      await resolveAndRefreshCompanyVat({
        id: order.company.id,
        country: order.company.country,
        vatNumber: order.company.vatNumber,
        viesValid: order.company.viesValid,
        viesValidatedAt: order.company.viesValidatedAt,
      })
    ).frozen;

  const { grossTotal } = vatOnNet(Number(order.total), frozen.vatRate);
  const prisma = getPrismaClient();
  await ensureInvoiceSequence();
  const invoiceNumber = await nextNumber(prisma, SEQ_INVOICE_2026);

  const invoice = await prisma.invoice.create({
    data: {
      id: createId(),
      orderId: order.id,
      companyId: order.companyId,
      invoiceNumber,
      status: "DRAFT",
      amount: grossTotal,
      ...vatWriteData(frozen),
      issuedAt: new Date(),
    },
    include: {
      order: { select: { orderNumber: true } },
    },
  });

  await logAuditEvent({
    eventType: "CREATE",
    category: "DATA",
    action: AUDIT_ACTIONS.invoiceCreate,
    entityType: "invoice",
    entityId: invoice.id,
    entityLabel: invoice.invoiceNumber,
    metadata: {
      order: order.id,
      bedrijf: order.companyId,
      bedrag: Number(invoice.amount),
      btwTarief: Number(frozen.vatRate),
    },
  });

  return invoice;
}
