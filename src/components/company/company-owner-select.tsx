"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setCompanyOwnerAction } from "@/app/(beveiligd)/actions/company-actions";
import { SelectMenu, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { DealTeamMember } from "@/lib/deal-service";

const UNASSIGNED = "__unassigned__";

export function CompanyOwnerSelect({
  companyId,
  ownerUserId,
  ownerName,
  ownerImage,
  members,
}: {
  companyId: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerImage?: string | null;
  members: DealTeamMember[];
}) {
  const router = useRouter();
  const serverValue = ownerUserId ?? UNASSIGNED;
  const [value, setValue] = useState(serverValue);
  const [fromServer, setFromServer] = useState(serverValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (serverValue !== fromServer) {
    setFromServer(serverValue);
    setValue(serverValue);
  }

  const items = useMemo(() => {
    const options: SelectOption[] = [
      { value: UNASSIGNED, label: "Niet toegewezen" },
      ...members.map((member) => ({
        value: member.id,
        label: member.name || member.email,
        image: member.image,
      })),
    ];
    if (ownerUserId && !options.some((option) => option.value === ownerUserId)) {
      options.splice(1, 0, {
        value: ownerUserId,
        label: ownerName || ownerUserId,
        image: ownerImage,
      });
    }
    return options;
  }, [members, ownerImage, ownerName, ownerUserId]);

  async function onValueChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setPending(true);
    setError(null);

    const result = await setCompanyOwnerAction(
      companyId,
      next === UNASSIGNED ? null : next,
    );
    setPending(false);
    if (result.error) {
      setValue(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <SelectMenu
        aria-label="Eigenaar wijzigen"
        value={value}
        onValueChange={onValueChange}
        items={items}
        size="sm"
        disabled={pending}
        className={cn(
          "w-auto max-w-[12rem] cursor-pointer border-transparent bg-transparent px-1.5 text-fg-muted",
          "hover:border-border hover:bg-surface hover:text-fg",
          "data-[popup-open]:border-border-strong data-[popup-open]:bg-surface data-[popup-open]:text-fg",
          "[&_svg]:opacity-50 group-hover/row:[&_svg]:opacity-100 data-[popup-open]:[&_svg]:opacity-100 focus-visible:[&_svg]:opacity-100",
        )}
      />
      {error ? (
        <p className="mt-0.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
