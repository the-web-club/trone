import * as React from "react";
import { pressableLinkMotion } from "@/components/motion/styles";
import { cn } from "@/lib/cn";

export type PageHeaderProps = {
  title: string;
  meta?: React.ReactNode[];
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  meta,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const metaItems = (meta ?? []).filter(Boolean);

  return (
    <header className={cn("page-header", className)}>
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
        {description ? (
          <div className="page-header-description">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function pageActionPrimaryClassName() {
  return cn(
    "inline-flex h-8 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover",
    pressableLinkMotion,
  );
}

export function pageActionSecondaryClassName() {
  return cn(
    "inline-flex h-8 items-center rounded-sm border border-border bg-surface px-3 text-sm font-medium text-fg shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-hover",
    pressableLinkMotion,
  );
}
