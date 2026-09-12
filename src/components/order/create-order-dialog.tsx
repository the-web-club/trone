"use client";

import { useActionState, useState } from "react";
import { createOrderFromQuoteAction } from "@/app/(beveiligd)/actions/order-actions";
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
import { formatEuroExact } from "@/lib/format";
import { quoteLinePresentation } from "@/lib/quote-catalog";

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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((item) => item.id)),
  );
  const [state, action, pending] = useActionState(
    createOrderFromQuoteAction,
    null,
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

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button">Order aanmaken</Button>}
      />
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Order aanmaken</DialogTitle>
          <p className="text-sm text-fg-muted">
            Kies welke offerteregels mee gaan. Prijzen blijven bevroren zoals
            de klant ze accepteerde.
          </p>
        </DialogHeader>
        <form action={action}>
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
            {state?.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter layout="auto" className="justify-between">
            <p className="text-sm text-fg-muted">
              {selectedItems.length}{" "}
              {selectedItems.length === 1 ? "regel" : "regels"} ·{" "}
              {formatEuroExact(selectedTotal)} excl. btw
            </p>
            <Button
              type="submit"
              loading={pending}
              disabled={selectedItems.length === 0}
            >
              Order aanmaken
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
