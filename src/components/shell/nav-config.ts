import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckSquare,
  FileText,
  Flame,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Workflow,
} from "lucide-react";

export type AppNavLink = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AppNavGroup = {
  type: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: AppNavLink[];
};

export type AppNavEntry = AppNavLink | AppNavGroup;

export const companiesNavGroup: AppNavGroup = {
  type: "group",
  id: "bedrijven",
  label: "Bedrijven",
  icon: Building2,
  children: [
    {
      type: "link",
      href: "/bedrijven",
      label: "Bekijk alle bedrijven",
      icon: Building2,
    },
    {
      type: "link",
      href: "/contacten",
      label: "Bekijk alle contacten",
      icon: Users,
    },
  ],
};

export const appMainNav: AppNavEntry[] = [
  { type: "link", href: "/overzicht", label: "Overzicht", icon: LayoutDashboard },
  { type: "link", href: "/taken", label: "Taken", icon: CheckSquare },
  { type: "link", href: "/leads", label: "Leads", icon: Workflow },
  companiesNavGroup,
  { type: "link", href: "/offertes", label: "Offertes", icon: FileText },
  { type: "link", href: "/orders", label: "Orders", icon: ShoppingCart },
];

export const appSettingsNav: AppNavLink = {
  type: "link",
  href: "/instellingen",
  label: "Instellingen",
  icon: Settings,
};

export const settingsHubModules: AppNavLink[] = [
  { type: "link", href: "/kansen", label: "Kansen", icon: Flame },
  { type: "link", href: "/producten", label: "Producten", icon: Package },
];

const pageTitles: Array<{ href: string; label: string }> = [
  { href: "/overzicht", label: "Overzicht" },
  { href: "/taken", label: "Taken" },
  { href: "/leads", label: "Leads" },
  { href: "/bedrijven", label: "Bedrijven" },
  { href: "/contacten", label: "Contacten" },
  { href: "/offertes", label: "Offertes" },
  { href: "/orders", label: "Orders" },
  { href: "/kansen", label: "Kansen" },
  { href: "/producten", label: "Producten" },
  { href: "/instellingen", label: "Instellingen" },
  { href: "/instellingen/feedback", label: "Feedback" },
];

const overviewPaths = new Set([
  "/overzicht",
  "/taken",
  "/leads",
  "/bedrijven",
  "/contacten",
  "/offertes",
  "/orders",
  "/kansen",
  "/producten",
  "/instellingen",
]);

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isCompaniesGroupActive(pathname: string): boolean {
  return companiesNavGroup.children.some((item) =>
    isNavItemActive(pathname, item.href),
  );
}

export function navTitleForPath(pathname: string): string {
  const match = pageTitles
    .filter((item) => isNavItemActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "TRÔNE Seating";
}

export function bottomNavIcon(entry: AppNavEntry): LucideIcon {
  if (entry.type === "link" && entry.href === "/leads") return Users;
  return entry.icon;
}

export function isOverviewNavPath(pathname: string): boolean {
  return overviewPaths.has(pathname);
}

export function parentNavPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/overzicht";
  segments.pop();
  const parent = `/${segments.join("/")}`;
  return parent || "/overzicht";
}
