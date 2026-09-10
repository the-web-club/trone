"use client";

import { useActionState } from "react";
import { toggleDealHotAction } from "@/app/(beveiligd)/actions/deal-actions";
import { detailMenuButtonClassName } from "@/components/detail/detail-action-menu";
import { Button } from "@/components/ui/button";

export function DealHotToggle({
  dealId,
  isHot,
  presentation = "button",
}: {
  dealId: string;
  isHot: boolean;
  presentation?: "button" | "menu";
}) {
  const [state, formAction, pending] = useActionState(toggleDealHotAction, null);
  const isMenu = presentation === "menu";

  return (
    <form action={formAction} className={isMenu ? "w-full" : undefined}>
      <input type="hidden" name="id" value={dealId} />
      <input type="hidden" name="isHot" value={isHot ? "false" : "true"} />
      <Button
        type="submit"
        variant={isMenu ? "ghost" : "secondary"}
        className={isMenu ? detailMenuButtonClassName() : undefined}
        loading={pending}
      >
        {isHot ? "Hot uitzetten" : "Markeer als hot"}
      </Button>
      {state?.error ? (
        <p className="mt-1 px-2 text-xs text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
