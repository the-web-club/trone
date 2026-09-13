export const themePreferences = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export const THEME_PREFERENCE_COOKIE = "trone-theme";
export const THEME_RESOLVED_COOKIE = "trone-theme-resolved";

export const themePreferenceLabels: Record<ThemePreference, string> = {
  light: "Licht",
  dark: "Donker",
  system: "Systeem",
};

export const themeCookieMaxAge = 60 * 60 * 24 * 365;

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
}

export function parseThemePreference(value: unknown): ThemePreference | null {
  return isThemePreference(value) ? value : null;
}

export function themePreferenceOrDefault(value: unknown): ThemePreference {
  return parseThemePreference(value) ?? DEFAULT_THEME_PREFERENCE;
}

export function parseResolvedTheme(value: unknown): ResolvedTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme | null,
): ResolvedTheme | null {
  if (preference === "light" || preference === "dark") return preference;
  return systemTheme;
}

export function themePreferenceFromUser(
  user: { themePreference?: unknown } | null | undefined,
): ThemePreference | null {
  return parseThemePreference(user?.themePreference);
}

export function systemThemeFromMedia(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyDocumentTheme(
  preference: ThemePreference,
  resolved: ResolvedTheme,
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme-preference", preference);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

function themeCookieAttributes() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; SameSite=Lax; Max-Age=${themeCookieMaxAge}${secure}`;
}

export function writeThemeCookies(
  preference: ThemePreference,
  resolved: ResolvedTheme,
) {
  if (typeof document === "undefined") return;
  const attrs = themeCookieAttributes();
  document.cookie = `${THEME_PREFERENCE_COOKIE}=${preference}; ${attrs}`;
  document.cookie = `${THEME_RESOLVED_COOKIE}=${resolved}; ${attrs}`;
}

export function writeResolvedThemeCookie(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_RESOLVED_COOKIE}=${resolved}; ${themeCookieAttributes()}`;
}

/** Inline script: resolves Systeem before first paint. Keep in sync with cookie names. */
export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement;var p=r.getAttribute("data-theme-preference");if(p!=="light"&&p!=="dark"&&p!=="system"){var m=document.cookie.match(/(?:^|; )trone-theme=([^;]*)/);p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";r.setAttribute("data-theme-preference",p);}var t=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;r.setAttribute("data-theme",t);r.style.colorScheme=t;})();`;
