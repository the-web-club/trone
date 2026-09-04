"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

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
  const [companyQuery, setCompanyQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const filteredCompanies = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    if (!query) return companies.slice(0, 8);
    return companies
      .filter((company) => company.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [companies, companyQuery]);

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    const scoped = companyId
      ? orders.filter((order) => order.companyId === companyId)
      : orders;
    if (!query) return scoped.slice(0, 8);
    return scoped
      .filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.companyName.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [companyId, orderQuery, orders]);

  const selectedCompany = companies.find((company) => company.id === companyId);
  const selectedOrder = orders.find((order) => order.id === orderId);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="orderId" value={orderId} />

      {lockCompany ? (
        <span className="text-xs text-fg-muted">
          {selectedCompany?.name ?? "Klant"}
        </span>
      ) : (
        <label className="relative min-w-40 flex-1">
          <span className="sr-only">Klant</span>
          <Input
            inputSize="sm"
            placeholder="Klant (optioneel)"
            value={selectedCompany && !companyQuery ? selectedCompany.name : companyQuery}
            onChange={(event) => {
              setCompanyQuery(event.target.value);
              setCompanyId("");
              setOrderId("");
              setCompanyOpen(true);
            }}
            onFocus={() => {
              if (selectedCompany) setCompanyQuery(selectedCompany.name);
              setCompanyOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setCompanyOpen(false), 120);
            }}
          />
          {companyOpen ? (
            <ul className="absolute z-[var(--z-overlay)] mt-1 max-h-48 w-full overflow-auto rounded-sm border border-border bg-surface shadow-[var(--shadow-pop)]">
              <li>
                <button
                  type="button"
                  className="block w-full px-2 py-1.5 text-left text-sm text-fg-muted hover:bg-hover"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setCompanyId("");
                    setCompanyQuery("");
                    setOrderId("");
                    setCompanyOpen(false);
                  }}
                >
                  Geen klant
                </button>
              </li>
              {filteredCompanies.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    className="block w-full px-2 py-1.5 text-left text-sm text-fg hover:bg-hover"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setCompanyId(company.id);
                      setCompanyQuery("");
                      setCompanyOpen(false);
                    }}
                  >
                    {company.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
      )}

      {lockOrder ? (
        <span className="text-xs text-fg-muted">
          {selectedOrder?.orderNumber ?? "Order"}
        </span>
      ) : (
        <label className="relative min-w-40 flex-1">
          <span className="sr-only">Order</span>
          <Input
            inputSize="sm"
            placeholder="Order (optioneel)"
            value={
              selectedOrder && !orderQuery
                ? selectedOrder.orderNumber
                : orderQuery
            }
            onChange={(event) => {
              setOrderQuery(event.target.value);
              setOrderId("");
              setOrderOpen(true);
            }}
            onFocus={() => {
              if (selectedOrder) setOrderQuery(selectedOrder.orderNumber);
              setOrderOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setOrderOpen(false), 120);
            }}
          />
          {orderOpen ? (
            <ul className="absolute z-[var(--z-overlay)] mt-1 max-h-48 w-full overflow-auto rounded-sm border border-border bg-surface shadow-[var(--shadow-pop)]">
              <li>
                <button
                  type="button"
                  className="block w-full px-2 py-1.5 text-left text-sm text-fg-muted hover:bg-hover"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setOrderId("");
                    setOrderQuery("");
                    setOrderOpen(false);
                  }}
                >
                  Geen order
                </button>
              </li>
              {filteredOrders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="block w-full px-2 py-1.5 text-left text-sm text-fg hover:bg-hover"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setOrderId(order.id);
                      setOrderQuery("");
                      setOrderOpen(false);
                      if (!companyId) setCompanyId(order.companyId);
                    }}
                  >
                    {order.orderNumber}
                    <span className="ml-1 text-fg-muted">{order.companyName}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
      )}
    </div>
  );
}
