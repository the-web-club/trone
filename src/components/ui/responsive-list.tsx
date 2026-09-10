import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Shows `desktop` from md breakpoint up; `mobile` below md. */
export function ResponsiveListView({
  desktop,
  mobile,
}: {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="flex flex-col gap-1.5 md:hidden">{mobile}</div>
    </>
  );
}

export function ListCard({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const classes = cn(
    "rounded-md border border-border bg-surface px-3 py-2",
    href && "relative transition-colors hover:bg-hover-subtle",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <article className={classes}>{children}</article>;
}

export function ListCardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListCardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-sm font-medium text-fg", className)}>
      {children}
    </div>
  );
}

export function ListCardMeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-0.5 text-xs text-fg-muted", className)}>{children}</p>
  );
}

export function ListCardRows({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function ListCardRow({
  label,
  children,
  className,
  span = "auto",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  span?: "auto" | "full";
}) {
  return (
    <div className={cn("min-w-0", span === "full" && "col-span-2", className)}>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 break-words text-fg">{children}</dd>
    </div>
  );
}

export function ListCardEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border border-border bg-surface px-3 py-4 text-center text-sm text-fg-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function ListCardActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Grouped related records with hairline separators instead of separate cards. */
export function CompactRecordList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-hidden rounded-md border border-border bg-surface",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function CompactRecordRow({
  href,
  title,
  status,
  meta,
  children,
}: {
  href?: string;
  title: React.ReactNode;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative hover:bg-hover-subtle">
      <div className="min-h-11 px-3 py-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 text-sm font-medium break-words text-fg">
            {href ? (
              <Link
                href={href}
                className="after:absolute after:inset-0 hover:underline"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </div>
          {status ? <div className="relative z-10 shrink-0">{status}</div> : null}
        </div>
        {meta ? (
          <p className="relative z-10 mt-0.5 text-xs break-words text-fg-muted">
            {meta}
          </p>
        ) : null}
        {children ? <div className="relative z-10 mt-0.5">{children}</div> : null}
      </div>
    </li>
  );
}
