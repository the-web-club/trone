import "server-only";

import { cookies } from "next/headers";
import {
  parseResolvedTheme,
  parseThemePreference,
  resolveTheme,
  THEME_PREFERENCE_COOKIE,
  THEME_RESOLVED_COOKIE,
  themeCookieMaxAge,
  themePreferenceFromUser,
  themePreferenceOrDefault,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

function cookieOptions() {
  return {
    path: "/",
    maxAge: themeCookieMaxAge,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readThemeFromRequest(user?: {
  themePreference?: unknown;
} | null): Promise<{
  preference: ThemePreference;
  resolved: ResolvedTheme | null;
}> {
  const store = await cookies();
  const accountPref = themePreferenceFromUser(user);
  const cookiePref = parseThemePreference(
    store.get(THEME_PREFERENCE_COOKIE)?.value,
  );
  const preference = themePreferenceOrDefault(accountPref ?? cookiePref);
  const resolvedCookie = parseResolvedTheme(
    store.get(THEME_RESOLVED_COOKIE)?.value,
  );
  return {
    preference,
    resolved: resolveTheme(preference, resolvedCookie),
  };
}

export async function persistThemeCookies(
  preference: ThemePreference,
  resolved?: ResolvedTheme | null,
) {
  const store = await cookies();
  const options = cookieOptions();
  store.set(THEME_PREFERENCE_COOKIE, preference, options);
  const nextResolved =
    resolved ?? (preference === "system" ? null : preference);
  if (nextResolved) {
    store.set(THEME_RESOLVED_COOKIE, nextResolved, options);
  }
}
