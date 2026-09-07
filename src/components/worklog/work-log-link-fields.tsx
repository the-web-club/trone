"use client";

import { useMemo, useState } from "react";
import { ComboboxMenu } from "@/components/ui/combobox";

export type WorkLogCompanyOption = {
  id: string;
  name: string;
};

export type WorkLogOrderOption = {
  id: string;
  orderNumber: string;
  companyId: string;
  companyName: string;
};

export function WorkLogLinkFields({
  companies,
  orders,
  defaultCompanyId,
  defaultOrderId,
  lockCompany,
  lockOrder,
}: {
  companies: WorkLogCompanyOption[];
  orders: WorkLogOrderOption[];
  defaultCompanyId?: string;
  defaultOrderId?: string;
  lockCompany?: boolean;
  lockOrder?: boolean;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");

  const selectedCompany = companies.find((company) => company.id === companyId);
  const selectedOrder = orders.find((order) => order.id === orderId);

  const companyItems = useMemo(
    () => [
      { value: "", label: "Geen klant" },
      ...companies.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    ],
    [companies],
  );

  const orderItems = useMemo(() => {
    const scoped = companyId
      ? orders.filter((order) => order.companyId === companyId)
      : orders;
    return [
      { value: "", label: "Geen order" },
      ...scoped.map((order) => ({
        value: order.id,
        label: order.orderNumber,
        hint: companyId ? undefined : order.companyName,
      })),
    ];
  }, [companyId, orders]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="orderId" value={orderId} />

      {lockCompany ? (
        <span className="text-xs text-fg-muted">
          {selectedCompany?.name ?? "Klant"}
        </span>
      ) : (
        <ComboboxMenu
          size="sm"
          value={companyId}
          onValueChange={(next) => {
            setCompanyId(next);
            if (next && orderId) {
              const order = orders.find((item) => item.id === orderId);
              if (order && order.companyId !== next) setOrderId("");
            }
          }}
          items={companyItems}
          placeholder="Klant (optioneel)"
          searchPlaceholder="Zoek een klant…"
          aria-label="Klant"
          className="min-w-40 flex-1"
        />
      )}

      {lockOrder ? (
        <span className="text-xs text-fg-muted">
          {selectedOrder?.orderNumber ?? "Order"}
        </span>
      ) : (
        <ComboboxMenu
          size="sm"
          value={orderId}
          onValueChange={(next) => {
            setOrderId(next);
            if (next && !companyId) {
              const order = orders.find((item) => item.id === next);
              if (order) setCompanyId(order.companyId);
            }
          }}
          items={orderItems}
          placeholder="Order (optioneel)"
          searchPlaceholder="Zoek een order…"
          aria-label="Order"
          className="min-w-40 flex-1"
        />
      )}
    </div>
  );
}
