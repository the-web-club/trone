"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  isNavItemActive,
  sidebarNavItemClassName,
} from "@/components/shell/app-sidebar";
import { appNavItems, navTitleForPath } from "@/components/shell/nav-config";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { authClient } from "@/lib/auth-client";
import { staffPath } from "@/lib/paths";

export function AppTopbar({
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
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const title = navTitleForPath(pathname);

  async function onLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.replace("/inloggen");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-h)] items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          aria-label={open ? "Navigatie sluiten" : "Navigatie openen"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
        <Link
          href="/overzicht"
          className="flex w-28 text-fg"
          aria-label="TRÔNE Seating"
        >
          <BrandLogo />
        </Link>
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg lg:text-base">
        {title}
      </p>

      {open ? (
        <div className="absolute inset-x-0 top-[var(--topbar-h)] z-[var(--z-overlay)] border-b border-border bg-surface p-2 shadow-[var(--shadow-pop)] lg:hidden">
          <nav className="flex flex-col gap-px" aria-label="Mobiele navigatie">
            {appNavItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={sidebarNavItemClassName(active)}
                >
                  <Icon aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 border-t border-border pt-2">
            <div className="mb-1 flex items-center gap-2 px-2">
              <UserAvatar name={userName} image={userImage} size="sm" />
              <div className="min-w-0">
                {userSlug ? (
                  <Link
                    href={staffPath({ slug: userSlug })}
                    className="block truncate text-sm text-fg hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    {userName}
                  </Link>
                ) : (
                  <p className="truncate text-sm text-fg">{userName}</p>
                )}
                <p className="truncate text-xs text-fg-subtle">{userEmail}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              loading={loggingOut}
              onClick={() => {
                void onLogout();
              }}
            >
              Uitloggen
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
