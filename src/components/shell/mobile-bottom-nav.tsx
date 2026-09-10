"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { controlMotion, pressableLinkMotion } from "@/components/motion/styles";
import {
  appMainNav,
  bottomNavIcon,
  companiesNavGroup,
  isCompaniesGroupActive,
  isNavItemActive,
  type AppNavEntry,
  type AppNavLink,
} from "@/components/shell/nav-config";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const itemClassName =
  "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 whitespace-nowrap text-[11px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

function activeColor(active: boolean) {
  return active
    ? "text-[var(--brand-accent)]"
    : "text-fg-subtle hover:text-fg-muted";
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="desktop-nav:hidden shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Hoofdnavigatie"
    >
      <div className="flex h-16 items-stretch">
        {appMainNav.map((entry) =>
          entry.type === "group" ? (
            <CompaniesNavItem key={entry.id} pathname={pathname} />
          ) : (
            <BottomNavLink key={entry.href} item={entry} pathname={pathname} />
          ),
        )}
      </div>
    </nav>
  );
}

function BottomNavLink({
  item,
  pathname,
}: {
  item: AppNavLink;
  pathname: string;
}) {
  const active = isNavItemActive(pathname, item.href);
  const Icon = bottomNavIcon(item);

  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClassName,
        controlMotion,
        pressableLinkMotion,
        activeColor(active),
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

function CompaniesNavItem({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const group = companiesNavGroup;
  const active = isCompaniesGroupActive(pathname);
  const Icon = bottomNavIcon(group as AppNavEntry);

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-current={active ? "page" : undefined}
        className={cn(
          itemClassName,
          controlMotion,
          pressableLinkMotion,
          activeColor(active),
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        <span>{group.label}</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-56 p-1 shadow-[var(--shadow-xs)]"
      >
        {group.children.map((item) => {
          const childActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={childActive ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center rounded-sm px-3 text-sm",
                controlMotion,
                childActive
                  ? "font-medium text-fg"
                  : "text-fg-muted hover:bg-hover hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </PopoverContent>
    </PopoverRoot>
  );
}
