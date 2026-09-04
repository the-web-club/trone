"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { appNavItems } from "@/components/shell/nav-config";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export function sidebarNavItemClassName(active: boolean): string {
  return cn(
    "flex h-7 items-center gap-2 rounded-sm px-2 text-sm transition-[color,background-color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-fg",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    active
      ? "bg-hover font-medium text-fg [&_svg]:text-fg"
      : "text-fg-muted hover:bg-hover hover:text-fg [&_svg]:text-fg-subtle hover:[&_svg]:text-fg-muted",
  );
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.replace("/inloggen");
    router.refresh();
  }

  return (
    <aside className="hidden h-full min-h-0 w-[var(--sidebar-w)] shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-[var(--topbar-h)] items-center px-4">
        <Link
          href="/overzicht"
          className="truncate text-sm font-medium tracking-tight text-fg"
        >
          TRÔNE Seating
        </Link>
      </div>
      <nav
        className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-2 pb-2"
        aria-label="Hoofdnavigatie"
      >
        {appNavItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={sidebarNavItemClassName(active)}
            >
              <Icon aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-1.5">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm text-fg">{userName}</p>
          <p className="truncate text-xs text-fg-subtle">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onLogout();
          }}
          disabled={loggingOut}
          className={sidebarNavItemClassName(false) + " w-full"}
        >
          <LogOut aria-hidden />
          <span>{loggingOut ? "Bezig…" : "Uitloggen"}</span>
        </button>
      </div>
    </aside>
  );
}
