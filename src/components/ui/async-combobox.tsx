"use client";

import * as React from "react";
import {
  ComboboxMenu,
  type ComboboxMenuProps,
  type ComboboxOption,
} from "@/components/ui/combobox";

/**
 * Combobox die zijn opties server-side zoekt.
 *
 * Zelfde uiterlijk en gedrag als `ComboboxMenu`; alleen de bron van de opties
 * verschilt. Nodig omdat de vorige opzet alle bedrijven en contacten als props
 * meestuurde en client-side filterde, wat op tienduizenden records megabytes
 * per navigatie kostte.
 *
 * - debounce van 220 ms op de zoekterm;
 * - geen request bij een lege zoekterm: dan staan de meegegeven `items`;
 * - een ouder antwoord kan een nieuwer nooit overschrijven (oplopend
 *   requestnummer), dus de laatste toetsaanslag bepaalt wat je ziet;
 * - de huidige selectie blijft altijd in de lijst, ook als die buiten de
 *   zoekresultaten valt.
 *
 * Het zoeken hangt aan de invoer-callback en niet aan een effect, zodat er
 * geen setState-in-effect-cascade ontstaat.
 */
export function AsyncComboboxMenu<Value extends string = string>({
  items,
  search,
  minChars = 1,
  debounceMs = 220,
  loadingLabel = "Zoeken…",
  emptyLabel = "Geen resultaten",
  ...rest
}: Omit<ComboboxMenuProps<Value>, "items"> & {
  items: Array<ComboboxOption<Value>>;
  search: (query: string) => Promise<Array<ComboboxOption<Value>>>;
  minChars?: number;
  debounceMs?: number;
  loadingLabel?: string;
}) {
  const [results, setResults] = React.useState<Array<
    ComboboxOption<Value>
  > | null>(null);
  const [loading, setLoading] = React.useState(false);

  const requestRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onQueryChange = React.useCallback(
    (raw: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const term = raw.trim();

      if (term.length < minChars) {
        // Terug naar de meegegeven opties; laat geen oud resultaat staan.
        requestRef.current += 1;
        setResults(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      timerRef.current = setTimeout(() => {
        const id = ++requestRef.current;
        search(term)
          .then((rows) => {
            if (id !== requestRef.current) return;
            setResults(rows);
          })
          .catch(() => {
            if (id !== requestRef.current) return;
            setResults([]);
          })
          .finally(() => {
            if (id === requestRef.current) setLoading(false);
          });
      }, debounceMs);
    },
    [search, minChars, debounceMs],
  );

  // Houd de geselecteerde optie zichtbaar, ook buiten het zoekresultaat.
  const selected = items.find((option) => option.value === rest.value);
  const visible = React.useMemo(() => {
    if (!results) return items;
    if (!selected || results.some((row) => row.value === selected.value)) {
      return results;
    }
    return [selected, ...results];
  }, [results, items, selected]);

  return (
    <ComboboxMenu<Value>
      {...rest}
      items={visible}
      emptyLabel={loading ? loadingLabel : emptyLabel}
      onInputValueChange={onQueryChange}
      // Server filtert al; nog een keer client-side filteren zou resultaten
      // wegstrepen die de database juist relevant vond.
      filter={null}
    />
  );
}
