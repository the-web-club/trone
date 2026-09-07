"use client";

import { useActionState } from "react";
import { updateOrderStatusAction } from "@/app/(beveiligd)/actions/order-actions";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select";
import type { OrderStatus } from "@/generated/prisma/client";
import { orderStatusLabels, orderStatuses } from "@/lib/orders-query";

export function OrderStatusForm({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [state, action, pending] = useActionState(
    updateOrderStatusAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={orderId} />
      <div className="flex flex-wrap items-center gap-2">
        <SelectMenu
          name="status"
          defaultValue={status}
          aria-label="Productiestatus"
          className="w-44"
          searchPlaceholder="Zoek een status…"
          items={orderStatuses.map((value) => ({
            value,
            label: orderStatusLabels[value],
          }))}
        />
        <Button type="submit" variant="secondary" loading={pending}>
          Status bijwerken
        </Button>
      </div>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
