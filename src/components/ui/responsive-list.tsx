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
      <div className="flex flex-col gap-2 md:hidden">{mobile}</div>
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
    "rounded-md border border-border bg-surface p-3",
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
    <dl className={cn("mt-2 grid gap-x-3 gap-y-1.5 text-sm", className)}>
      {children}
    </dl>
  );
}

export function ListCardRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,5.5rem)_1fr] items-baseline gap-x-2",
        className,
      )}
    >
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-fg">{children}</dd>
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
        "rounded-md border border-border bg-surface px-3 py-6 text-center text-sm text-fg-muted",
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
        "mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
