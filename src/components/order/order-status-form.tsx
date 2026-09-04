"use client";

import { useActionState } from "react";
import { updateOrderStatusAction } from "@/app/(beveiligd)/actions/order-actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
        <Select
          name="status"
          defaultValue={status}
          aria-label="Productiestatus"
          className="w-44"
        >
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {orderStatusLabels[value]}
            </option>
          ))}
        </Select>
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
