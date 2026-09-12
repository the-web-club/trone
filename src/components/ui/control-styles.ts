import { controlMotion, overlayMotion } from "@/components/motion/styles";

export const controlSize = {
  xs: "h-6 px-1.5 text-xs",
  sm: "h-7 px-2 text-sm",
  md: "min-h-11 px-3.5 text-sm md:h-8 md:min-h-8 md:px-2.5",
} as const;

export type ControlSize = keyof typeof controlSize;

export { controlMotion };

export const focusRingField =
  "focus-visible:border-fg focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none";

export const focusRingOutline =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

export const fieldBase =
  "w-full rounded-sm border border-border bg-surface text-fg " +
  controlMotion +
  " placeholder:text-fg-subtle hover:border-border-strong " +
  focusRingField +
  " disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunk disabled:text-fg-muted" +
  " aria-invalid:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-ring-danger" +
  " data-[invalid]:border-danger";

export const popupSurface =
  "rounded-md border border-border bg-surface p-1 shadow-[var(--shadow-pop)] outline-none";

export const popupMotion = overlayMotion;

export const popupItem =
  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none select-none " +
  controlMotion +
  " data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
