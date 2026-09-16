import type { SelectOption } from "@/components/ui/select";
import {
  facetHint,
  mergeFacetOptions,
  toCountMap,
  type FacetCatalogItem,
} from "@/lib/filters/options";

export function facetSelectOptions<Value extends string = string>(args: {
  catalog: readonly FacetCatalogItem[];
  counts: Array<{ value: string; count: number }> | null;
  selected?: string | string[];
  all?: { value: Value; label: string; count?: number | null };
}): Array<SelectOption<Value>> {
  const selected = Array.isArray(args.selected)
    ? args.selected
    : args.selected
      ? [args.selected]
      : [];
  const counts = args.counts == null ? null : toCountMap(args.counts);
  const options = mergeFacetOptions({
    catalog: args.catalog,
    counts,
    selected,
  }).map((option) => ({
    value: option.value as Value,
    label: option.label,
    hint: facetHint(option.count),
    disabled: option.disabled,
    image: option.image,
  }));

  if (!args.all) return options;
  return [
    {
      value: args.all.value,
      label: args.all.label,
      hint: facetHint(args.all.count ?? null),
      disabled: false,
    },
    ...options,
  ];
}
