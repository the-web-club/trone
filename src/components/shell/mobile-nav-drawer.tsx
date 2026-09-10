"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isNavItemActive,
  sidebarNavItemClassName,
} from "@/components/shell/app-sidebar";
import { appNavItems } from "@/components/shell/nav-config";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { authClient } from "@/lib/auth-client";
import { staffPath } from "@/lib/paths";

export function MobileNavDrawer({
  open,
  onClose,
  userName,
  userEmail,
  userImage,
  userSlug,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userSlug?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  async function onLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.replace("/inloggen");
    router.refresh();
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Navigatie sluiten"
        className="fixed inset-0 z-[var(--z-overlay)] bg-fg/20 lg:hidden"
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobiele navigatie"
        tabIndex={-1}
        className="mobile-nav-drawer fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-[var(--z-overlay)] flex flex-col border-t border-border bg-surface shadow-[var(--shadow-pop)] outline-none lg:hidden"
      >
        <nav
          className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-contain p-2"
          aria-label="Mobiele navigatie"
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
                onClick={handleClose}
                className={sidebarNavItemClassName(active, true)}
              >
                <Icon aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="mb-1 flex items-center gap-2 px-2 py-1">
            <UserAvatar name={userName} image={userImage} size="sm" />
            <div className="min-w-0">
              {userSlug ? (
                <Link
                  href={staffPath({ slug: userSlug })}
                  className="block truncate text-sm text-fg hover:underline"
                  onClick={handleClose}
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
            size="md"
            className="h-11 w-full justify-start"
            loading={loggingOut}
            onClick={() => {
              void onLogout();
            }}
          >
            Uitloggen
          </Button>
        </div>
      </div>
    </>
  );
}
