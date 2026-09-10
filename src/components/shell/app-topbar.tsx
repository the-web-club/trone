"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { MobileNavDrawer } from "@/components/shell/mobile-nav-drawer";
import { navTitleForPath } from "@/components/shell/nav-config";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const title = navTitleForPath(pathname);

  return (
    <>
      <header className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-h)] items-center gap-2 border-b border-border bg-surface px-4 sm:gap-3 lg:px-6">
        <div className="flex items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
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
      </header>
      <MobileNavDrawer
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        userSlug={userSlug}
      />
    </>
  );
}
