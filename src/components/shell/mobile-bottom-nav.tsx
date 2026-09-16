"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { createElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { controlMotion, pressableLinkMotion } from "@/components/motion/styles";
import {
  clearMobileBottomNavTotalHeight,
  setMobileBottomNavTotalHeight,
} from "@/components/shell/mobile-bottom-nav-height";
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
  DrawerBody,
  DrawerClose,
  DrawerDescription,
  DrawerHandle,
  DrawerHeader,
  DrawerRoot,
  DrawerSheet,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const sync = () => {
      setMobileBottomNavTotalHeight(nav.getBoundingClientRect().height);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      clearMobileBottomNavTotalHeight();
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="relative z-[var(--z-mobile-bottom-nav)] desktop-nav:hidden shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]"
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

function BottomNavGlyph({ item }: { item: AppNavEntry }) {
  return createElement(bottomNavIcon(item), {
    className: "size-5",
    strokeWidth: 1.75,
    "aria-hidden": true,
  });
}

function BottomNavLink({
  item,
  pathname,
}: {
  item: AppNavLink;
  pathname: string;
}) {
  const active = isNavItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      data-audit-action={`navigation${item.href.replace(/\//g, ".")}`}
      data-audit-target={`bottom-nav${item.href}`}
      data-audit-label={item.label}
      data-audit-component="MobileBottomNav"
      data-audit-type="nav-item"
      className={cn(
        itemClassName,
        controlMotion,
        pressableLinkMotion,
        activeColor(active),
      )}
    >
      <BottomNavGlyph item={item} />
      <span>{item.label}</span>
    </Link>
  );
}

function CompaniesNavItem({ pathname }: { pathname: string }) {
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === pathname;
  const group = companiesNavGroup;
  const active = isCompaniesGroupActive(pathname);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-mobile-drawer-open", open);
    return () => {
      document.documentElement.removeAttribute("data-mobile-drawer-open");
    };
  }, [open]);

  return (
    <DrawerRoot
      modal={false}
      open={open}
      onOpenChange={(next) => setOpenForPath(next ? pathname : null)}
    >
      <DrawerTrigger
        aria-current={active ? "page" : undefined}
        data-audit-action="ui.bottom_nav_group_open"
        data-audit-target={`bottom-nav-group.${group.id}`}
        data-audit-label={group.label}
        data-audit-component="MobileBottomNav"
        data-audit-type="drawer-trigger"
        className={cn(
          itemClassName,
          controlMotion,
          pressableLinkMotion,
          activeColor(active),
        )}
      >
        <BottomNavGlyph item={group} />
        <span>{group.label}</span>
      </DrawerTrigger>
      <DrawerSheet>
        <DrawerHandle />
        <DrawerHeader>
          <DrawerTitle>{group.label}</DrawerTitle>
          <DrawerDescription>
            Kies een bestemming in {group.label}.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <ul className="list-none px-2 pb-2">
            {group.children.map((item, index) => {
              const childActive = isNavItemActive(pathname, item.href);
              const ItemIcon = item.icon;
              return (
                <li key={item.href}>
                  <DrawerClose
                    nativeButton={false}
                    render={
                      <Link
                        href={item.href}
                        prefetch
                        aria-current={childActive ? "page" : undefined}
                      />
                    }
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 px-3 text-sm",
                      index > 0 && "border-t border-border",
                      controlMotion,
                      childActive
                        ? "bg-selected-bg font-medium text-[var(--brand-accent)] active:bg-hover"
                        : "text-fg hover:bg-hover hover:text-fg active:bg-hover [&_svg]:text-fg-subtle",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
                    )}
                  >
                    <ItemIcon
                      className="size-5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 text-left leading-snug">
                      {item.label}
                    </span>
                    {childActive ? (
                      <Check
                        className="size-4 shrink-0 text-[var(--brand-accent)]"
                        strokeWidth={2.4}
                        aria-hidden
                      />
                    ) : null}
                  </DrawerClose>
                </li>
              );
            })}
          </ul>
        </DrawerBody>
      </DrawerSheet>
    </DrawerRoot>
  );
}
