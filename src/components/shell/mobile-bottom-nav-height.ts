export const MOBILE_BOTTOM_NAV_HEIGHT_VAR = "--mobile-bottom-nav-total-height";

export function measuredBottomNavHeightPx(height: number): string {
  return `${Math.max(0, height)}px`;
}

export function setMobileBottomNavTotalHeight(height: number): void {
  document.documentElement.style.setProperty(
    MOBILE_BOTTOM_NAV_HEIGHT_VAR,
    measuredBottomNavHeightPx(height),
  );
}

export function clearMobileBottomNavTotalHeight(): void {
  document.documentElement.style.removeProperty(MOBILE_BOTTOM_NAV_HEIGHT_VAR);
}
