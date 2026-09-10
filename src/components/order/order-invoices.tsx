"use client";

import { useActionState } from "react";
import { createInvoiceFromOrderAction } from "@/app/(beveiligd)/actions/invoice-actions";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CompactRecordList,
  CompactRecordRow,
} from "@/components/ui/responsive-list";
import { formatEuroExact, formatDate } from "@/lib/format";
import type { InvoiceStatus, VatRegime } from "@/generated/prisma/client";

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Concept",
  OPEN: "Open",
  PAID: "Betaald",
  OVERDUE: "Vervallen",
  CANCELLED: "Geannuleerd",
};

const invoiceStatusTones: Record<
  InvoiceStatus,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  DRAFT: "default",
  OPEN: "info",
  PAID: "success",
  OVERDUE: "warning",
  CANCELLED: "danger",
};

export type OrderInvoiceView = {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  amount: { toString(): string } | number;
  vatRate: { toString(): string } | number | null;
  vatRegime: VatRegime | null;
  vatNotice: string | null;
  createdAt: Date;
};

export function OrderInvoices({
  orderId,
  invoices,
}: {
  orderId: string;
  invoices: OrderInvoiceView[];
}) {
  const [state, action, pending] = useActionState(
    createInvoiceFromOrderAction,
    null,
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label font-medium tracking-wide text-fg-muted uppercase">
          Facturen
        </h2>
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" variant="secondary" loading={pending}>
            Factuur aanmaken
          </Button>
        </form>
      </div>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {invoices.length === 0 ? (
        <p className="text-sm text-fg-muted">Nog geen facturen bij deze order.</p>
      ) : (
        <CompactRecordList>
          {invoices.map((invoice) => {
            const vatRate = invoice.vatRate == null ? 21 : Number(invoice.vatRate);
            return (
              <CompactRecordRow
                key={invoice.id}
                title={invoice.invoiceNumber ?? "Conceptfactuur"}
                status={
                  <Badge tone={invoiceStatusTones[invoice.status]}>
                    {invoiceStatusLabels[invoice.status]}
                  </Badge>
                }
                meta={`${formatDate(invoice.createdAt)} · ${formatEuroExact(Number(invoice.amount))}`}
              >
                <VatTreatmentNotice
                  vatRate={vatRate}
                  vatRegime={invoice.vatRegime}
                  warning={invoice.vatNotice}
                />
              </CompactRecordRow>
            );
          })}
        </CompactRecordList>
      )}
    </section>
  );
}
