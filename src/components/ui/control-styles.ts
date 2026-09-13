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
  "w-full rounded-sm border border-border bg-input text-fg " +
  controlMotion +
  " placeholder:text-fg-subtle hover:border-border-strong " +
  focusRingField +
  " disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunk disabled:text-fg-muted" +
  " aria-invalid:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-ring-danger" +
  " data-[invalid]:border-danger";

/** Permanent surface for inline-editable detail fields. */
export const inlineFieldMotion =
  "transition-[background-color,border-color,box-shadow] duration-[var(--inline-field-duration)] ease-[var(--ease-in-out)]";

export const inlineFieldChrome =
  "inline-field-control rounded-sm border border-inline-field-border bg-inline-field text-fg shadow-[var(--inline-field-shadow)] " +
  inlineFieldMotion +
  " hover:border-inline-field-hover-border hover:bg-inline-field-hover hover:shadow-[var(--inline-field-hover-shadow)] " +
  "data-[popup-open]:border-inline-field-open-border data-[popup-open]:bg-inline-field-hover " +
  "data-[editing]:border-inline-field-open-border data-[editing]:bg-inline-field " +
  focusRingField +
  " disabled:cursor-not-allowed disabled:border-inline-field-border disabled:bg-inline-field disabled:text-fg-muted disabled:opacity-70 disabled:hover:border-inline-field-border disabled:hover:bg-inline-field" +
  " data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70 data-[disabled]:hover:border-inline-field-border data-[disabled]:hover:bg-inline-field" +
  " aria-invalid:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-ring-danger";

export const inlineFieldControl =
  "min-h-11 items-center px-2.5 py-1.5 text-sm md:min-h-9 md:h-auto";

export const inlineFieldLabel =
  "inline-field-label text-label font-medium text-pretty break-words text-fg-muted";

export const popupSurface =
  "rounded-md border border-border bg-surface-raised p-1 shadow-[var(--shadow-pop)] outline-none";

export const popupMotion = overlayMotion;

export const popupItem =
  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none select-none " +
  controlMotion +
  " data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
