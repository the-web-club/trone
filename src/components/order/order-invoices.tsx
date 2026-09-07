"use client";

import { useActionState } from "react";
import { createInvoiceFromOrderAction } from "@/app/(beveiligd)/actions/invoice-actions";
import { VatTreatmentNotice } from "@/components/vat/vat-treatment-notice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <section className="flex flex-col gap-4">
      <div className="page-header">
        <h2 className="text-md font-medium text-fg">Facturen</h2>
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
        <ul className="flex flex-col gap-3">
          {invoices.map((invoice) => {
            const vatRate = invoice.vatRate == null ? 21 : Number(invoice.vatRate);
            return (
              <li
                key={invoice.id}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-fg">
                    {invoice.invoiceNumber ?? "Conceptfactuur"}
                  </p>
                  <Badge tone={invoiceStatusTones[invoice.status]}>
                    {invoiceStatusLabels[invoice.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-fg-muted">
                  {formatDate(invoice.createdAt)} · {formatEuroExact(Number(invoice.amount))}
                </p>
                <div className="mt-2">
                  <VatTreatmentNotice
                    vatRate={vatRate}
                    vatRegime={invoice.vatRegime}
                    warning={invoice.vatNotice}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
