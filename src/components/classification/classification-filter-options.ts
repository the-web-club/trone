import type { SelectOption } from "@/components/ui/select";
import {
  APPLICATIONS,
  CLASSIFICATION_FILTER_NO_COMPANY,
  CLASSIFICATION_FILTER_UNKNOWN,
  INDUSTRIES,
  applicationFilterLabel,
  industryFilterLabel,
  sectorFilterLabel,
} from "@/lib/classification";

export function industryFilterSelectOptions(options?: {
  includeNoCompany?: boolean;
}): SelectOption[] {
  const items: SelectOption[] = [];
  if (options?.includeNoCompany) {
    items.push({
      value: CLASSIFICATION_FILTER_NO_COMPANY,
      label: industryFilterLabel(CLASSIFICATION_FILTER_NO_COMPANY),
    });
  }
  items.push({
    value: CLASSIFICATION_FILTER_UNKNOWN,
    label: industryFilterLabel(CLASSIFICATION_FILTER_UNKNOWN),
  });
  for (const industry of INDUSTRIES) {
    items.push({ value: industry.code, label: industry.label });
  }
  return items;
}

export function sectorFilterSelectOptions(): SelectOption[] {
  const items: SelectOption[] = [
    {
      value: CLASSIFICATION_FILTER_UNKNOWN,
      label: sectorFilterLabel(CLASSIFICATION_FILTER_UNKNOWN),
    },
  ];
  const seen = new Set<string>();
  for (const industry of INDUSTRIES) {
    for (const sector of industry.sectors) {
      if (seen.has(sector.code)) continue;
      seen.add(sector.code);
      items.push({ value: sector.code, label: sector.label });
    }
  }
  return items;
}

export function applicationFilterSelectOptions(): SelectOption[] {
  return APPLICATIONS.map((item) => ({
    value: item.code,
    label: applicationFilterLabel(item.code),
  }));
}
