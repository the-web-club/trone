/** Token-based motion classes. Enige CSS-animatielaag buiten tokens.css. */

export const controlMotion =
  "transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-in-out)]";

export const overlayMotion =
  "origin-[var(--transform-origin)] transition-[opacity,transform] duration-[var(--motion-base)] ease-[var(--ease-out-expo)]" +
  " data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98]" +
  " data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]" +
  " data-[ending-style]:duration-[var(--motion-fast)] data-[ending-style]:ease-[var(--ease-in-quart)]";

export const pressRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

export const dialogBackdropMotion =
  "transition-opacity duration-[var(--motion-base)] ease-[var(--ease-out-expo)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-[var(--motion-fast)] data-[ending-style]:ease-[var(--ease-in-quart)]";

export const dialogPopupMotion =
  "origin-[var(--transform-origin,center_top)] transition-[opacity,transform] duration-[var(--motion-base)] ease-[var(--ease-out-expo)] data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:duration-[var(--motion-fast)] data-[ending-style]:ease-[var(--ease-in-quart)]";

export const iconMotion =
  "transition-transform duration-[var(--motion-fast)] ease-[var(--ease-in-out)]";

export const pressableLinkMotion =
  "transition-[background-color,border-color,transform] duration-[var(--motion-instant)] ease-[var(--ease-in-out)] active:scale-[var(--press-scale)]";
