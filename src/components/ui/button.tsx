"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { controlMotion, focusRingOutline } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  cn(
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap",
    controlMotion,
    focusRingOutline,
    "disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg shadow-[var(--shadow-xs)] hover:bg-accent-hover active:bg-accent",
        secondary:
          "border border-border bg-surface text-fg shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-hover active:bg-selected",
        ghost:
          "bg-transparent text-fg-muted hover:bg-hover hover:text-fg active:bg-selected",
        destructive:
          "bg-danger text-fg-invert shadow-[var(--shadow-xs)] hover:brightness-110 active:brightness-95",
      },
      size: {
        xs: "h-6 gap-1 px-1.5 text-xs [&_svg]:size-3",
        sm: "h-7 px-2.5 text-sm [&_svg]:size-3.5",
        md: "h-8 px-3 text-sm [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentPropsWithoutRef<
  typeof ButtonPrimitive
> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <ButtonPrimitive
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1.5",
          loading && "invisible",
        )}
      >
        {children}
      </span>
      {loading ? (
        <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          <span className="sr-only">Bezig…</span>
        </span>
      ) : null}
    </ButtonPrimitive>
  );
}

export { buttonVariants };
