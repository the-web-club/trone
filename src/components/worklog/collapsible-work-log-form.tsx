"use client";

import { CollapsibleComposer } from "@/components/detail/collapsible-composer";
import { WorkLogForm } from "@/components/worklog/work-log-form";
import type {
  WorkLogCompanyOption,
  WorkLogOrderOption,
} from "@/components/worklog/work-log-link-fields";

export function CollapsibleWorkLogForm({
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
  return (
    <CollapsibleComposer label="Werkzaamheid loggen">
      {({ close }) => (
        <WorkLogForm
          companies={companies}
          orders={orders}
          defaultCompanyId={defaultCompanyId}
          defaultOrderId={defaultOrderId}
          lockCompany={lockCompany}
          lockOrder={lockOrder}
          onSuccess={close}
        />
      )}
    </CollapsibleComposer>
  );
}
