import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { pressableLinkMotion } from "@/components/motion/styles";
import { cn } from "@/lib/cn";

export type PageHeaderProps = {
  title: string;
  nav?: React.ReactNode;
  meta?: React.ReactNode[];
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  nav,
  meta,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const metaItems = (meta ?? []).filter(Boolean);

  return (
    <header className={cn("page-header", className)}>
      {nav ? <div className="page-header-nav-wrap">{nav}</div> : null}
      <div className="page-header-main">
        <div className="page-header-copy">
          <h1 className="page-header-title">{title}</h1>
          {metaItems.length > 0 ? (
            <p className="page-header-meta">
              {metaItems.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? (
                    <span className="text-fg-subtle" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span className="min-w-0 max-w-full break-words">{item}</span>
                </React.Fragment>
              ))}
            </p>
          ) : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {description ? (
        <div className="page-header-description">{description}</div>
      ) : null}
    </header>
  );
}

export function PageHeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={pageHeaderNavClassName()}>
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function pageHeaderNavClassName() {
  return cn(
    "page-header-nav inline-flex max-w-full items-center gap-0.5 text-sm text-fg-muted hover:text-fg",
    pressableLinkMotion,
  );
}

export function pageActionPrimaryClassName() {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm bg-accent px-3.5 text-sm font-medium whitespace-nowrap text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover md:min-h-8 md:px-3",
    pressableLinkMotion,
  );
}

export function pageActionSecondaryClassName() {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm border border-border bg-surface px-3.5 text-sm font-medium whitespace-nowrap text-fg shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-hover md:min-h-8 md:px-3",
    pressableLinkMotion,
  );
}
