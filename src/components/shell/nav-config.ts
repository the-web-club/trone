import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckSquare,
  ClipboardList,
  Flame,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Workflow,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  { href: "/overzicht", label: "Overzicht", icon: LayoutDashboard },
  { href: "/kansen", label: "Kansen", icon: Flame },
  { href: "/leads", label: "Leads", icon: Workflow },
  { href: "/taken", label: "Taken", icon: CheckSquare },
  { href: "/bedrijven", label: "Bedrijven", icon: Building2 },
  { href: "/contacten", label: "Contacten", icon: Users },
  { href: "/offertes", label: "Offertes", icon: FileText },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/producten", label: "Producten", icon: Package },
  { href: "/logboek", label: "Logboek", icon: ClipboardList },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

export function navTitleForPath(pathname: string): string {
  const match = appNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "TRÔNE Seating";
}
