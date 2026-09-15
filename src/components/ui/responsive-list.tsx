import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Stretched hit area for the primary record action, without wrapping controls. */
export const listCardHitAreaClassName =
  "after:absolute after:inset-0 after:z-0 after:rounded-md " +
  "focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-fg";

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
      <div className="flex flex-col gap-2.5 md:hidden">{mobile}</div>
    </>
  );
}

export function ListCard({
  children,
  className,
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-1.5 rounded-md border border-border bg-surface px-3 py-3",
        (interactive || onClick) && "transition-colors hover:bg-hover-subtle",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </article>
  );
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
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const titleClass = cn(
    "min-w-0 text-md font-medium break-words text-fg",
    className,
  );

  if (!href) {
    return <div className={titleClass}>{children}</div>;
  }

  return (
    <div className={titleClass}>
      <Link href={href} className={listCardHitAreaClassName}>
        {children}
      </Link>
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
  if (children == null || children === false || children === "") return null;
  return (
    <p className={cn("min-w-0 text-sm break-words text-fg-muted", className)}>
      {children}
    </p>
  );
}

export function ListCardContext({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (children == null || children === false || children === "") return null;
  return (
    <p className={cn("min-w-0 text-sm break-words text-fg-muted", className)}>
      {children}
    </p>
  );
}

export function ListCardSignals({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListCardFacts({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (children == null || children === false) return null;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListCardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-10 mt-0.5 flex min-w-0 items-center justify-between gap-2 border-t border-border pt-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListCardControl({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10 min-w-0", className)}>{children}</div>
  );
}

export function ListCardDate({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 text-sm whitespace-nowrap text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
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
        "grid grid-cols-2 gap-x-3 gap-y-1 text-sm",
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
        "relative z-10 mt-0.5 flex flex-wrap items-center gap-2 border-t border-border pt-2",
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
      <div className="min-h-11 px-3 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 text-md font-medium break-words text-fg">
            {href ? (
              <Link href={href} className={listCardHitAreaClassName}>
                {title}
              </Link>
            ) : (
              title
            )}
          </div>
          {status ? (
            <div className="relative z-10 max-w-[min(100%,11rem)] shrink-0">
              {status}
            </div>
          ) : null}
        </div>
        {meta ? (
          <p className="relative z-10 mt-0.5 text-sm break-words text-fg-muted">
            {meta}
          </p>
        ) : null}
        {children ? (
          <div className="relative z-10 mt-1">{children}</div>
        ) : null}
      </div>
    </li>
  );
}
