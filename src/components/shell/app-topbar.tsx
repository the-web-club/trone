"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AccountMenu } from "@/components/shell/account-menu";
import {
  isOverviewNavPath,
  navTitleForPath,
  parentNavPath,
} from "@/components/shell/nav-config";
import { pressableLinkMotion } from "@/components/motion/styles";
import { cn } from "@/lib/cn";

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
  const title = navTitleForPath(pathname);
  const overview = isOverviewNavPath(pathname);

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[calc(var(--topbar-h)+env(safe-area-inset-top,0px))] items-center gap-2 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top,0px)] sm:px-4 desktop-nav:gap-3 desktop-nav:px-6">
      {overview ? (
        <Link
          href="/overzicht"
          className="flex h-11 w-[5.25rem] shrink-0 items-center text-fg desktop-nav:hidden"
          aria-label="TRÔNE Seating"
        >
          <BrandLogo />
        </Link>
      ) : (
        <Link
          href={parentNavPath(pathname)}
          aria-label={`Terug naar ${title}`}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center text-fg-muted hover:text-fg desktop-nav:hidden",
            pressableLinkMotion,
          )}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      )}
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium text-fg desktop-nav:text-base",
          overview && "hidden desktop-nav:block",
        )}
      >
        {title}
      </p>
      {overview ? <div className="min-w-0 flex-1 desktop-nav:hidden" /> : null}
      <div className="shrink-0 desktop-nav:hidden">
        <AccountMenu
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          userSlug={userSlug}
        />
      </div>
    </header>
  );
}
