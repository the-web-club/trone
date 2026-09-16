"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  flushAuditEvents,
  isAuditIgnoredRoute,
  trackAuditEvent,
} from "@/lib/audit/client";
import { describeAuditClick } from "@/lib/audit/click-target";
import { describeAuditFilterChange } from "@/lib/audit/filter-change";
import {
  AUDIT_ACTIONS,
  auditCategoryForRoute,
  normalizeAuditAction,
} from "@/lib/audit/registry";
import { sanitizeAuditText } from "@/lib/audit/sanitize";

/**
 * Centrale client-side tracker.
 *
 * Eén component, gemount in de beveiligde layout. Alle clientevents lopen hier
 * langs met event delegation op `document`; er staat dus geen losse logging in
 * knoppen, dialogen of filtercomponenten.
 *
 * Wat hier wordt vastgelegd:
 *   - page views en route changes (pathname)
 *   - kliks op alles wat interactief is (delegated, capture-fase)
 *   - openen en sluiten van dialogen en drawers (MutationObserver op portals)
 *   - tabwissels
 *   - filters, zoeken, sorteren en pagineren (verandering van de querystring)
 *   - formulier gestart, verzonden en validatiefouten
 *   - copy-acties
 *   - niet-afgehandelde clientfouten
 *
 * Niets in dit component blokkeert een klik, navigatie of submit:
 * `trackAuditEvent` zet het event synchroon in een wachtrij en gaat verder.
 * Zie src/lib/audit/client-queue.ts.
 */
export function AuditTracker() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // --- Page views en URL-veranderingen -------------------------------------
  //
  // `usePathname()` verandert niet mee met de querystring, en `useSearchParams()`
  // dwingt de hele boom in een Suspense-grens. De querystring wordt daarom
  // uitgelezen uit `window.location`, aangestuurd door een eigen listener op
  // history-mutaties. Dat dekt zowel router.replace uit de filters als de
  // browserknoppen.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastPathname = "";
    let lastSearch = window.location.search;

    function report() {
      const route = window.location.pathname;
      const search = window.location.search;
      if (isAuditIgnoredRoute(route)) {
        lastPathname = route;
        lastSearch = search;
        return;
      }

      if (route !== lastPathname) {
        const previousRoute = lastPathname;
        lastPathname = route;
        lastSearch = search;
        trackAuditEvent({
          eventType: "PAGE_VIEW",
          category: auditCategoryForRoute(route, "NAVIGATION"),
          action: normalizeAuditAction(
            `navigation${route.replace(/\//g, ".")}` || AUDIT_ACTIONS.pageView,
          ),
          route,
          entityType: "page",
          targetKey: route,
          metadata: {
            van: previousRoute || null,
            heeftFilters: search.length > 1,
          },
        });
        return;
      }

      if (search !== lastSearch) {
        const change = describeAuditFilterChange(lastSearch, search, route);
        lastSearch = search;
        if (!change) return;
        trackAuditEvent({
          eventType: change.eventType,
          category: auditCategoryForRoute(route, "UI"),
          action: normalizeAuditAction(change.action),
          route,
          targetKey: change.changedKeys.join(","),
          metadata: {
            gewijzigd: change.changedKeys,
            ...(change.metadata ?? {}),
          },
        });
      }
    }

    // History-mutaties zijn niet observeerbaar; patchen is de enige manier om
    // een router.replace uit de filtercomponenten te zien. De originele
    // functies worden bij unmount teruggezet.
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    function wrap<T extends typeof window.history.pushState>(original: T): T {
      return function patched(
        this: History,
        ...args: Parameters<typeof window.history.pushState>
      ) {
        const result = original.apply(this, args);
        // Na de mutatie, zodat window.location al bij is.
        queueMicrotask(report);
        return result;
      } as T;
    }

    window.history.pushState = wrap(originalPush);
    window.history.replaceState = wrap(originalReplace);
    window.addEventListener("popstate", report);
    report();

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener("popstate", report);
    };
  }, []);

  // --- Kliks ---------------------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;

    function onClick(event: MouseEvent) {
      // Alleen primaire kliks en toetsenbord-activaties; een rechtermuisklik is
      // geen actie.
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const descriptor = describeAuditClick(target);
      if (!descriptor) return;

      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;

      const isTab = descriptor.targetType === "tab";
      trackAuditEvent({
        eventType: isTab ? "TAB_CHANGED" : "UI_CLICK",
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(descriptor.action ?? AUDIT_ACTIONS.uiClick),
        route,
        targetType: descriptor.targetType,
        targetKey: descriptor.targetKey,
        targetLabel: descriptor.targetLabel,
        component: descriptor.component,
        href: descriptor.href,
        metadata: {
          doelsoort: descriptor.targetType,
          ...(descriptor.href ? { href: descriptor.href } : {}),
        },
      });
    }

    // Capture-fase: ook kliks die een component met stopPropagation afvangt
    // komen langs. Passive kan niet bij click, maar er wordt niets zwaars
    // gedaan: de listener zet één object in een array.
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // --- Dialogen en drawers -------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;

    function describeOverlay(element: Element): {
      kind: "modal" | "drawer";
      label: string | null;
      key: string | null;
    } | null {
      const role = element.getAttribute("role");
      const isDialog =
        role === "dialog" ||
        role === "alertdialog" ||
        element.tagName === "DIALOG";
      if (!isDialog) return null;
      if (element.closest("[data-audit-ignore]")) return null;

      // Base UI zet de drawer in een eigen viewport; het onderscheid komt uit
      // het data-attribuut dat de drawer-primitives meegeven.
      const isDrawer =
        element.hasAttribute("data-drawer") ||
        element.getAttribute("data-audit-type") === "drawer" ||
        Boolean(element.closest("[data-drawer]"));

      const titleElement = element.querySelector(
        "[data-audit-label],h1,h2,h3,[id$='title']",
      );
      const label =
        sanitizeAuditText(element.getAttribute("data-audit-label"), 80) ??
        sanitizeAuditText(element.getAttribute("aria-label"), 80) ??
        sanitizeAuditText(titleElement?.textContent, 80);

      return {
        kind: isDrawer ? "drawer" : "modal",
        label,
        key: sanitizeAuditText(
          element.getAttribute("data-audit-target") ??
            element.getAttribute("id"),
          120,
        ),
      };
    }

    function report(element: Element, opened: boolean) {
      const overlay = describeOverlay(element);
      if (!overlay) return;
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;

      const eventType =
        overlay.kind === "drawer"
          ? opened
            ? "DRAWER_OPENED"
            : "DRAWER_CLOSED"
          : opened
            ? "MODAL_OPENED"
            : "MODAL_CLOSED";

      trackAuditEvent({
        eventType,
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(
          `ui.${overlay.kind}.${opened ? "open" : "close"}`,
        ),
        route,
        targetType: overlay.kind,
        targetKey: overlay.key ?? overlay.label,
        targetLabel: overlay.label,
      });
    }

    // Overlays worden geportald naar body; childList op body met subtree pakt
    // zowel de portalwrapper als de popup zelf.
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          report(node, true);
          node
            .querySelectorAll?.("[role='dialog'],[role='alertdialog'],dialog")
            .forEach((child) => report(child, true));
        }
        for (const node of mutation.removedNodes) {
          if (!(node instanceof Element)) continue;
          report(node, false);
          node
            .querySelectorAll?.("[role='dialog'],[role='alertdialog'],dialog")
            .forEach((child) => report(child, false));
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // --- Formulieren en copy -------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Eén FORM_STARTED per formulier per paginabezoek; anders levert elke
    // veldwissel een event op.
    const started = new WeakSet<Element>();

    function formDescriptor(form: Element) {
      return {
        key:
          sanitizeAuditText(form.getAttribute("data-audit-target"), 120) ??
          sanitizeAuditText(form.getAttribute("name"), 120) ??
          sanitizeAuditText(form.getAttribute("id"), 120),
        label:
          sanitizeAuditText(form.getAttribute("data-audit-label"), 80) ??
          sanitizeAuditText(form.getAttribute("aria-label"), 80),
        component: sanitizeAuditText(
          form.getAttribute("data-audit-component"),
          64,
        ),
      };
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      if (!form || started.has(form)) return;
      if (form.closest("[data-audit-ignore]")) return;
      started.add(form);

      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      const descriptor = formDescriptor(form);
      trackAuditEvent({
        eventType: "FORM_STARTED",
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(`form.start${route.replace(/\//g, ".")}`),
        route,
        targetType: "form",
        targetKey: descriptor.key,
        targetLabel: descriptor.label,
        component: descriptor.component,
      });
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof Element)) return;
      if (form.closest("[data-audit-ignore]")) return;
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      const descriptor = formDescriptor(form);
      // Alleen dat er verzonden is, nooit de ingevulde waarden.
      trackAuditEvent({
        eventType: "FORM_SUBMITTED",
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(`form.submit${route.replace(/\//g, ".")}`),
        route,
        targetType: "form",
        targetKey: descriptor.key,
        targetLabel: descriptor.label,
        component: descriptor.component,
      });
    }

    function onInvalid(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-audit-ignore]")) return;
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      trackAuditEvent({
        eventType: "FORM_VALIDATION_FAILED",
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(`form.invalid${route.replace(/\//g, ".")}`),
        route,
        result: "FAILURE",
        severity: "NOTICE",
        targetType: "field",
        // Alleen de veldnaam, nooit de ingevoerde waarde.
        targetKey: sanitizeAuditText(target.getAttribute("name"), 120),
        targetLabel: sanitizeAuditText(target.getAttribute("aria-label"), 80),
      });
    }

    function onCopy() {
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      // Bewust zonder de gekopieerde inhoud.
      trackAuditEvent({
        eventType: "COPY_ACTION",
        category: auditCategoryForRoute(route, "UI"),
        action: normalizeAuditAction(`ui.copy${route.replace(/\//g, ".")}`),
        route,
        targetType: "selection",
      });
    }

    document.addEventListener("focusin", onFocusIn, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    document.addEventListener("invalid", onInvalid, { capture: true });
    document.addEventListener("copy", onCopy);

    return () => {
      document.removeEventListener("focusin", onFocusIn, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
      document.removeEventListener("invalid", onInvalid, { capture: true });
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  // --- Clientfouten --------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    function onError(event: ErrorEvent) {
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      trackAuditEvent({
        eventType: "CLIENT_ERROR",
        category: "ERROR",
        action: "client.error",
        route,
        result: "FAILURE",
        severity: "ERROR",
        // Alleen de melding en de bestandsnaam; geen stacktrace, want daar
        // staan vaak query- en gebruikersgegevens in.
        metadata: {
          melding: sanitizeAuditText(event.message, 200),
          bestand: sanitizeAuditText(event.filename, 200),
          regel: event.lineno ?? null,
        },
      });
    }

    function onRejection(event: PromiseRejectionEvent) {
      const route = window.location.pathname;
      if (isAuditIgnoredRoute(route)) return;
      const reason = event.reason;
      trackAuditEvent({
        eventType: "CLIENT_ERROR",
        category: "ERROR",
        action: "client.unhandled_rejection",
        route,
        result: "FAILURE",
        severity: "ERROR",
        metadata: {
          melding: sanitizeAuditText(
            reason instanceof Error ? reason.message : String(reason ?? ""),
            200,
          ),
        },
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // --- Wachtrij legen bij verlaten -----------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;

    function onHidden() {
      if (document.visibilityState === "hidden") {
        flushAuditEvents({ final: true });
      }
    }
    function onPageHide() {
      flushAuditEvents({ final: true });
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      // Bij unmount (uitloggen, navigatie naar buiten de shell) alsnog legen.
      flushAuditEvents({ final: true });
    };
  }, []);

  return null;
}
