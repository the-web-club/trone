import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function OptionSection({
  title,
  hint,
  incomplete,
  children,
}: {
  title: string;
  hint?: string;
  incomplete?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 px-0 py-0",
        incomplete && "bg-warning-bg",
      )}
    >
      <header className="flex flex-col gap-0.5">
        <h3
          className={cn(
            "text-label font-medium tracking-wide uppercase",
            incomplete ? "text-warning" : "text-fg-muted",
          )}
        >
          {title}
          {incomplete ? (
            <span className="ml-2 font-normal normal-case tracking-normal">
              nog een keuze nodig
            </span>
          ) : null}
        </h3>
        {hint ? <p className="text-sm text-fg-subtle">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
