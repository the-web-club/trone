"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { controlMotion } from "@/components/motion/styles";
import { appNavItems } from "@/components/shell/nav-config";
import { UserAvatar } from "@/components/user/user-avatar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { staffPath } from "@/lib/paths";

export function sidebarNavItemClassName(
  active: boolean,
  mobile = false,
): string {
  return cn(
    "flex items-center gap-2 rounded-sm px-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-fg",
    mobile ? "min-h-11 py-2" : "h-7",
    controlMotion,
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
  userImage,
  userSlug,
}: {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userSlug?: string | null;
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
      <div className="flex h-[var(--topbar-h)] items-center px-5">
        <Link
          href="/overzicht"
          className="flex w-28 text-fg"
          aria-label="TRÔNE Seating"
        >
          <BrandLogo />
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
        <div className="flex items-center gap-2 px-2 py-1.5">
          <UserAvatar name={userName} image={userImage} size="sm" />
          <div className="min-w-0">
            {userSlug ? (
              <Link
                href={staffPath({ slug: userSlug })}
                className="block truncate text-sm text-fg hover:underline"
              >
                {userName}
              </Link>
            ) : (
              <p className="truncate text-sm text-fg">{userName}</p>
            )}
            <p className="truncate text-xs text-fg-subtle">{userEmail}</p>
          </div>
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
