import { THEME_INIT_SCRIPT } from "@/lib/theme";

export function ThemeInitScript() {
  return (
    <script
      id="trone-theme-init"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
