"use client";

import { useMemo } from "react";
import { INLINE_SELECT_EMPTY, InlineSelectField } from "@/components/detail/inline-select-field";
import { InlineMultiSelectField } from "@/components/detail/inline-multi-select-field";
import type { SelectOption } from "@/components/ui/select";
import {
  applicationSelectOptions,
  formatApplicationLabels,
  industrySelectOptions,
  relationTypeSelectOptions,
  sectorSelectOptions,
} from "@/lib/classification";

export function industryFieldOptions(): SelectOption[] {
  return industrySelectOptions().map((item) => ({
    value: item.code || INLINE_SELECT_EMPTY,
    label: item.label,
  }));
}

export function sectorFieldOptions(industryCode: string | null | undefined): SelectOption[] {
  return sectorSelectOptions(industryCode).map((item) => ({
    value: item.code || INLINE_SELECT_EMPTY,
    label: item.label,
  }));
}

export function applicationFieldOptions(): SelectOption[] {
  return applicationSelectOptions().map((item) => ({
    value: item.code,
    label: item.label,
  }));
}

export function relationTypeFieldOptions(): SelectOption[] {
  return relationTypeSelectOptions().map((item) => ({
    value: item.code,
    label: item.label,
  }));
}

export function CompanyIndustrySectorFields({
  industryCode,
  sectorCode,
  disabled,
  hint,
  onSaveIndustry,
  onSaveSector,
}: {
  industryCode: string | null;
  sectorCode: string | null;
  disabled?: boolean;
  hint?: string;
  onSaveIndustry: (next: string) => Promise<string | null>;
  onSaveSector: (next: string) => Promise<string | null>;
}) {
  const industryItems = useMemo(() => industryFieldOptions(), []);
  const sectorItems = useMemo(
    () => sectorFieldOptions(industryCode),
    [industryCode],
  );

  return (
    <>
      <InlineSelectField
        label="Hoofdbranche"
        value={industryCode ?? ""}
        items={industryItems}
        layout="row"
        disabled={disabled}
        searchPlaceholder="Zoek een hoofdbranche…"
        onSave={onSaveIndustry}
      />
      <InlineSelectField
        label="Sector"
        value={sectorCode ?? ""}
        items={sectorItems}
        layout="row"
        disabled={disabled || !industryCode}
        searchPlaceholder="Zoek een sector…"
        onSave={onSaveSector}
      />
      {hint ? (
        <p className="col-span-2 text-xs text-fg-muted">{hint}</p>
      ) : null}
    </>
  );
}

export function CompanyRelationTypeField({
  values,
  disabled,
  onSave,
}: {
  values: string[];
  disabled?: boolean;
  onSave: (next: string[]) => Promise<string | null>;
}) {
  const items = useMemo(() => relationTypeFieldOptions(), []);
  return (
    <InlineMultiSelectField
      label="Relatietypen"
      values={values}
      items={items}
      disabled={disabled}
      emptyLabel="Geen relatietype"
      layout="row"
      span="full"
      onSave={onSave}
    />
  );
}

export function DealApplicationsField({
  values,
  disabled,
  onSave,
}: {
  values: string[];
  disabled?: boolean;
  onSave: (next: string[]) => Promise<string | null>;
}) {
  const items = useMemo(() => applicationFieldOptions(), []);
  return (
    <InlineMultiSelectField
      label="Toepassingen"
      values={values}
      items={items}
      disabled={disabled}
      emptyLabel="Onbekend"
      layout="row"
      span="full"
      onSave={onSave}
    />
  );
}

export function ApplicationsFromDeals({ codes }: { codes: string[] }) {
  const label = formatApplicationLabels(codes);
  return (
    <div className="inline-field col-span-2 flex flex-col gap-1">
      <p className="inline-field-label text-label font-medium text-fg-muted">
        Toepassingen uit aanvragen
      </p>
      <p className="text-sm text-fg">
        {label || "Nog geen toepassingen op gekoppelde aanvragen."}
      </p>
    </div>
  );
}
