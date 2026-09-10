"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AppNav, sidebarNavItemClassName } from "@/components/shell/app-nav";
import { UserAvatar } from "@/components/user/user-avatar";
import { authClient } from "@/lib/auth-client";
import { staffPath } from "@/lib/paths";

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
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.replace("/inloggen");
    router.refresh();
  }

  return (
    <aside className="hidden h-full min-h-0 w-[var(--sidebar-w)] shrink-0 flex-col overflow-x-hidden border-r border-border bg-surface desktop-nav:flex">
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center px-5">
        <Link
          href="/overzicht"
          className="flex w-28 text-fg"
          aria-label="TRÔNE Seating"
        >
          <BrandLogo />
        </Link>
      </div>
      <AppNav />
      <div className="shrink-0 border-t border-border p-1.5">
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
