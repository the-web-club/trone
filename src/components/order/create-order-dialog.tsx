"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderFromQuoteAction } from "@/app/(beveiligd)/actions/order-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { formatEuroExact } from "@/lib/format";
import { refreshAfterSuccess } from "@/lib/form-submission";
import { orderPath } from "@/lib/paths";
import { quoteLinePresentation } from "@/lib/quote-catalog";
import { safeParseCreateOrderFromQuoteForm } from "@/lib/order-validation";

export type CreateOrderLine = {
  id: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  configSnapshot: unknown;
};

export function CreateOrderDialog({
  quoteId,
  items,
}: {
  quoteId: string;
  items: CreateOrderLine[];
}) {
  const router = useRouter();
  const form = useFormSubmission({
    pendingLabel: "Aanmaken…",
    successLabel: "Aangemaakt",
  });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((item) => item.id)),
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = items.filter((item) => selected.has(item.id));
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      validate: safeParseCreateOrderFromQuoteForm,
      save: async (data) => {
        const saved = await createOrderFromQuoteAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.order) return { result: saved.order };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (order) => {
        form.handleOpenChange(false, setOpen);
        refreshAfterSuccess(() => router.push(orderPath(order)));
      },
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => form.handleOpenChange(next, setOpen)}
    >
      <DialogTrigger
        render={<Button type="button">Order aanmaken</Button>}
      />
      <DialogContent size="lg">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Order aanmaken</DialogTitle>
          <p className="text-sm text-fg-muted">
            Kies welke offerteregels mee gaan. Prijzen blijven bevroren zoals
            de klant ze accepteerde.
          </p>
        </DialogHeader>
        <form action={onSubmit} noValidate>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <DialogBody className="flex flex-col gap-3">
            {items.map((item) => {
              const presentation = quoteLinePresentation(item);
              const checked = selected.has(item.id);
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface-sunk/40 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="itemId"
                    value={item.id}
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-fg">
                        {presentation.title}
                      </span>
                      <span className="text-sm text-fg-muted">
                        {presentation.isCustom
                          ? formatEuroExact(
                              presentation.hasPrice ? item.unitPrice : null,
                            )
                          : `${item.quantity} × ${formatEuroExact(item.unitPrice)}`}
                      </span>
                    </span>
                    {presentation.body ? (
                      <span className="mt-0.5 block text-sm font-normal text-fg-muted">
                        {presentation.body}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-sm text-fg-muted">
                      {formatEuroExact(
                        presentation.hasPrice ? item.lineTotal : null,
                      )}{" "}
                      excl. btw
                    </span>
                  </span>
                </label>
              );
            })}
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter layout="auto" className="justify-between">
            <p className="text-sm text-fg-muted">
              {selectedItems.length}{" "}
              {selectedItems.length === 1 ? "regel" : "regels"} ·{" "}
              {formatEuroExact(selectedTotal)} excl. btw
            </p>
            <SubmitStatusButton
              readyLabel="Order aanmaken"
              pendingLabel="Aanmaken…"
              successLabel="Aangemaakt"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
