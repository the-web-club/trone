"use client";

import { useState } from "react";
import { ComboboxMenu } from "@/components/ui/combobox";
import { countrySelectOptions } from "@/lib/countries";

const OPTIONS = countrySelectOptions();

export function CountrySelect({
  id,
  name = "country",
  defaultValue = "NL",
  value,
  onValueChange,
  required,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;

  return (
    <>
      <input type="hidden" name={name} value={current} />
      <ComboboxMenu
        id={id}
        items={OPTIONS}
        value={current}
        onValueChange={(next) => {
          const country = next || defaultValue;
          if (value === undefined) setUncontrolled(country);
          onValueChange?.(country);
        }}
        required={required}
        placeholder="Kies een land"
        searchPlaceholder="Zoek een land…"
        emptyLabel="Geen land gevonden"
        aria-label="Land"
      />
    </>
  );
}
