"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTheme } from "@/components/theme/theme-provider";
import {
  themePreferenceLabels,
  type ThemePreference,
} from "@/lib/theme";

const items: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: themePreferenceLabels.light, icon: Sun },
  { value: "dark", label: themePreferenceLabels.dark, icon: Moon },
  { value: "system", label: themePreferenceLabels.system, icon: Monitor },
];

export function ThemePreferenceForm() {
  const { preference, pending, setPreference } = useTheme();

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-fg">Thema</p>
        <p className="text-sm text-fg-muted">
          Geldt voor dit account, op elk apparaat waarop je bent ingelogd.
          Systeem volgt de instelling van je besturingssysteem.
        </p>
      </div>
      <SegmentedControl
        aria-label="Thema"
        value={preference}
        disabled={pending}
        onValueChange={setPreference}
        items={items}
      />
    </div>
  );
}
