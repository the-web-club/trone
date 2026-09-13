"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AccountMenu } from "@/components/shell/account-menu";
import { useChromeTitle } from "@/components/shell/chrome-title";
import {
  breadcrumbAncestor,
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
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[calc(var(--topbar-h)+env(safe-area-inset-top,0px))] items-center border-b border-border bg-chrome pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 sm:px-4 desktop-nav:hidden">
        {overview ? (
          <Link
            href="/overzicht"
            className="flex h-11 w-[5.25rem] shrink-0 items-center text-fg"
            aria-label="TRÔNE Seating"
          >
            <BrandLogo />
          </Link>
        ) : (
          <Link
            href={parentNavPath(pathname)}
            aria-label={`Terug naar ${title}`}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center text-fg-muted hover:text-fg",
              pressableLinkMotion,
            )}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        )}
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium text-fg",
            overview && "hidden",
          )}
        >
          {title}
        </p>
        {overview ? <div className="min-w-0 flex-1" /> : null}
        <div className="shrink-0">
          <AccountMenu
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            userSlug={userSlug}
          />
        </div>
      </div>
      <div className="hidden h-full min-w-0 flex-1 desktop-nav:flex">
        <div className="chrome-bar-inner">
          <DesktopRouteContext pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function DesktopRouteContext({ pathname }: { pathname: string }) {
  const ancestor = breadcrumbAncestor(pathname);
  const chromeTitle = useChromeTitle();

  if (!ancestor) return null;

  const current = chromeTitle && chromeTitle !== ancestor.label ? chromeTitle : null;
  if (!current) return null;

  return (
    <nav
      aria-label="Broodkruimels"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      <Link
        href={ancestor.href}
        className={cn(
          "shrink-0 text-fg-muted hover:text-fg",
          pressableLinkMotion,
        )}
      >
        {ancestor.label}
      </Link>
      <span className="shrink-0 text-fg-subtle" aria-hidden>
        /
      </span>
      <span className="min-w-0 truncate font-medium text-fg">{current}</span>
    </nav>
  );
}
