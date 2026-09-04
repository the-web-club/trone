"use client";

import { useActionState } from "react";
import { toggleDealHotAction } from "@/app/(beveiligd)/actions/deal-actions";
import { Button } from "@/components/ui/button";

export function DealHotToggle({
  dealId,
  isHot,
}: {
  dealId: string;
  isHot: boolean;
}) {
  const [state, formAction, pending] = useActionState(toggleDealHotAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={dealId} />
      <input type="hidden" name="isHot" value={isHot ? "false" : "true"} />
      <Button type="submit" variant="secondary" loading={pending}>
        {isHot ? "Hot uitzetten" : "Markeer als hot"}
      </Button>
      {state?.error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
