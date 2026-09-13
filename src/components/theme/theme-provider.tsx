"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { updateThemePreferenceAction } from "@/app/(beveiligd)/actions/theme-actions";
import {
  applyDocumentTheme,
  parseResolvedTheme,
  resolveTheme,
  writeResolvedThemeCookie,
  writeThemeCookies,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  pending: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribeSystemTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  preference,
  resolved,
  children,
}: {
  preference: ThemePreference;
  resolved: ResolvedTheme | null;
  children: React.ReactNode;
}) {
  const [optimistic, setOptimistic] = useState<ThemePreference | null>(null);
  const currentPreference = optimistic ?? preference;
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    () => resolved ?? "light",
  );
  const nextResolved =
    resolveTheme(currentPreference, systemTheme) ?? resolved ?? "light";
  const [pending, startTransition] = useTransition();
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      const current = parseResolvedTheme(
        document.documentElement.getAttribute("data-theme"),
      );
      if (currentPreference === "system" && current) {
        writeResolvedThemeCookie(current);
      }
      return;
    }
    applyDocumentTheme(currentPreference, nextResolved);
    writeThemeCookies(currentPreference, nextResolved);
  }, [currentPreference, nextResolved]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      const resolvedNow = resolveTheme(next, getSystemTheme()) ?? "light";
      setOptimistic(next);
      applyDocumentTheme(next, resolvedNow);
      writeThemeCookies(next, resolvedNow);
      startTransition(async () => {
        const result = await updateThemePreferenceAction(next);
        if (result.error) {
          setOptimistic(null);
          const fallback =
            resolveTheme(preference, getSystemTheme()) ?? "light";
          applyDocumentTheme(preference, fallback);
          writeThemeCookies(preference, fallback);
        }
      });
    },
    [preference],
  );

  const value = useMemo(
    () => ({
      preference: currentPreference,
      resolved: nextResolved,
      pending,
      setPreference,
    }),
    [currentPreference, nextResolved, pending, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme moet binnen ThemeProvider gebruikt worden.");
  }
  return value;
}
