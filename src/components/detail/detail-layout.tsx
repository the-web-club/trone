import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { pressableLinkMotion } from "@/components/motion/styles";
import { cn } from "@/lib/cn";

/** Compact page wrapper for entity detail views. */
export function DetailPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "detail-page flex min-w-0 flex-col gap-3 desktop-nav:gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-0.5 text-sm text-fg-muted hover:text-fg sm:min-h-0",
        pressableLinkMotion,
      )}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}

export function DetailHeader({
  back,
  title,
  status,
  meta,
  actions,
  className,
}: {
  back?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("detail-header min-w-0", className)}>
      {back ? (
        <div className="mb-0.5 hidden desktop-nav:block">{back}</div>
      ) : null}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{title}</div>
        {status ? (
          <div className="shrink-0 pt-0.5">{status}</div>
        ) : null}
      </div>
      {meta ? (
        <div className="detail-meta mt-1 min-w-0 text-sm text-fg-muted">
          {meta}
        </div>
      ) : null}
      {actions ? (
        <div className="detail-actions mt-2 flex items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** Inline metadata separated by middots. */
export function DetailMetaRow({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}>
      {visible.map((item, index) => (
        <span key={index} className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          {index > 0 ? (
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="min-w-0 break-words">{item}</span>
        </span>
      ))}
    </p>
  );
}

export function DetailColumns({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  if (!right) {
    return <div className={cn("min-w-0", className)}>{left}</div>;
  }

  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-3 desktop-nav:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 desktop-nav:gap-5">{left}</div>
      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[calc(var(--topbar-h)+1rem)] lg:max-h-[calc(100dvh-var(--topbar-h)-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        {right}
      </aside>
    </div>
  );
}

export function DetailSection({
  title,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}) {
  if (collapsible) {
    return (
      <section className={cn("detail-section min-w-0", className)}>
        <details className="group" open={defaultOpen}>
          <summary className="detail-section-heading flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-label font-medium tracking-wide text-fg-muted uppercase">
              {title}
            </span>
            <span className="flex items-center gap-2">
              {action}
              <span
                className="text-fg-subtle transition-transform group-open:rotate-90"
                aria-hidden
              >
                ›
              </span>
            </span>
          </summary>
          <div className="mt-1.5">{children}</div>
        </details>
      </section>
    );
  }

  return (
    <section className={cn("detail-section min-w-0", className)}>
      <div className="detail-section-heading mb-1.5 flex min-h-7 items-center justify-between gap-2">
        <h2 className="text-label font-medium tracking-wide text-fg-muted uppercase">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Two-column grid of stacked label/value fields. */
export function DetailFieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("detail-field-grid", className)}>{children}</div>
  );
}

/** Read-only property cell that matches inline field density. */
export function DetailValueField({
  label,
  children,
  span = "auto",
  className,
}: {
  label: string;
  children: ReactNode;
  span?: "auto" | "full";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-field flex min-w-0 flex-col gap-0.5",
        span === "full" && "col-span-2",
        className,
      )}
    >
      <span className="text-label font-medium text-fg-muted">{label}</span>
      <div className="min-h-8 px-1 py-1 text-sm break-words text-fg">
        {children}
      </div>
    </div>
  );
}

/** Bordered surface for grouped detail content. */
export function DetailPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <p className="text-sm text-fg-muted">
      {children}
      {action ? <> {action}</> : null}
    </p>
  );
}
