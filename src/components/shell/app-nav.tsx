"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Collapse } from "@/components/motion";
import { controlMotion, iconMotion } from "@/components/motion/styles";
import {
  appMainNav,
  appSettingsNav,
  companiesNavGroup,
  isCompaniesGroupActive,
  isNavItemActive,
  type AppNavLink,
} from "@/components/shell/nav-config";
import { cn } from "@/lib/cn";

export function sidebarNavItemClassName(
  active: boolean,
  mobile = false,
): string {
  return cn(
    "flex items-center gap-2 rounded-sm px-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-fg",
    mobile ? "min-h-11 py-2" : "h-7 min-h-7",
    controlMotion,
    "[&_svg]:size-4 [&_svg]:shrink-0",
    active
      ? "bg-hover font-medium text-fg [&_svg]:text-fg"
      : "text-fg-muted hover:bg-hover hover:text-fg [&_svg]:text-fg-subtle hover:[&_svg]:text-fg-muted",
  );
}

export function AppNav({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col overflow-x-hidden"
      aria-label={mobile ? "Mobiele navigatie" : "Hoofdnavigatie"}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-2">
        {appMainNav.map((entry) =>
          entry.type === "group" ? (
            <CompaniesNavGroup
              key={entry.id}
              pathname={pathname}
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ) : (
            <NavLink
              key={entry.href}
              item={entry}
              pathname={pathname}
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ),
        )}
      </div>
      <div className="shrink-0 border-t border-border px-2 py-2">
        <NavLink
          item={appSettingsNav}
          pathname={pathname}
          mobile={mobile}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  mobile,
  onNavigate,
  linkRef,
  nested = false,
}: {
  item: AppNavLink;
  pathname: string;
  mobile: boolean;
  onNavigate?: () => void;
  linkRef?: React.Ref<HTMLAnchorElement>;
  nested?: boolean;
}) {
  const active = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      ref={linkRef}
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        sidebarNavItemClassName(active, mobile),
        nested && (mobile ? "h-auto min-h-11 items-start py-2.5" : "h-auto min-h-7 py-1"),
      )}
    >
      <Icon aria-hidden />
      <span className={cn("min-w-0", nested ? "text-left leading-snug" : "truncate")}>
        {item.label}
      </span>
    </Link>
  );
}

function CompaniesNavGroup({
  pathname,
  mobile,
  onNavigate,
}: {
  pathname: string;
  mobile: boolean;
  onNavigate?: () => void;
}) {
  const group = companiesNavGroup;
  const groupActive = isCompaniesGroupActive(pathname);
  const [userOpen, setUserOpen] = useState(false);
  const open = groupActive || userOpen;
  const submenuId = useId();
  const firstChildRef = useRef<HTMLAnchorElement>(null);
  const pendingFocus = useRef(false);
  const Icon = group.icon;

  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    pendingFocus.current = false;
    firstChildRef.current?.focus();
  }, [open]);

  function setOpen(next: boolean) {
    if (groupActive) return;
    setUserOpen(next);
  }

  function onGroupKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      pendingFocus.current = true;
      setOpen(true);
    }
    if (
      (event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "Escape") &&
      open &&
      !groupActive
    ) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-px">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={submenuId}
        onClick={() => setOpen(!open)}
        onKeyDown={onGroupKeyDown}
        className={cn(sidebarNavItemClassName(groupActive, mobile), "w-full")}
      >
        <Icon aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 shrink-0", iconMotion, open && "rotate-180")}
        />
      </button>
      <Collapse open={open}>
        <div
          id={submenuId}
          role="group"
          aria-label={group.label}
          className="flex flex-col gap-px pb-0.5 pl-3"
        >
          {group.children.map((item, index) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              mobile={mobile}
              onNavigate={onNavigate}
              nested
              linkRef={index === 0 ? firstChildRef : undefined}
            />
          ))}
        </div>
      </Collapse>
    </div>
  );
}
