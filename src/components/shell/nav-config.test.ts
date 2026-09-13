import { Building2, Users, Workflow } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  appMainNav,
  bottomNavIcon,
  breadcrumbAncestor,
  companiesNavGroup,
  isCompaniesGroupActive,
  isNavItemActive,
  isOverviewNavPath,
  navTitleForPath,
  parentNavPath,
} from "@/components/shell/nav-config";

describe("isNavItemActive", () => {
  it("marks exact and nested paths", () => {
    expect(isNavItemActive("/bedrijven", "/bedrijven")).toBe(true);
    expect(isNavItemActive("/bedrijven/acme", "/bedrijven")).toBe(true);
    expect(isNavItemActive("/leads", "/lead")).toBe(false);
    expect(isNavItemActive("/overzicht", "/bedrijven")).toBe(false);
  });
});

describe("isCompaniesGroupActive", () => {
  it("is active on company and contact pages, including details", () => {
    expect(isCompaniesGroupActive("/bedrijven")).toBe(true);
    expect(isCompaniesGroupActive("/bedrijven/nieuw")).toBe(true);
    expect(isCompaniesGroupActive("/contacten")).toBe(true);
    expect(isCompaniesGroupActive("/contacten/jan")).toBe(true);
    expect(isCompaniesGroupActive("/leads")).toBe(false);
    expect(isCompaniesGroupActive("/instellingen")).toBe(false);
  });
});

describe("navTitleForPath", () => {
  it("uses short titles for the commercial flow", () => {
    expect(navTitleForPath("/overzicht")).toBe("Overzicht");
    expect(navTitleForPath("/taken")).toBe("Taken");
    expect(navTitleForPath("/leads/demo")).toBe("Leads");
    expect(navTitleForPath("/bedrijven/acme")).toBe("Bedrijven");
    expect(navTitleForPath("/contacten/jan")).toBe("Contacten");
    expect(navTitleForPath("/offertes")).toBe("Offertes");
    expect(navTitleForPath("/orders/2026-00001")).toBe("Orders");
  });

  it("keeps settings modules titled after they leave the main nav", () => {
    expect(navTitleForPath("/kansen")).toBe("Kansen");
    expect(navTitleForPath("/producten")).toBe("Producten");
    expect(navTitleForPath("/instellingen/drempels")).toBe("Drempels");
    expect(navTitleForPath("/instellingen/weergave")).toBe("Weergave");
    expect(navTitleForPath("/instellingen/feedback")).toBe("Feedback");
    expect(navTitleForPath("/instellingen/feedback/demo")).toBe("Feedback");
    expect(navTitleForPath("/instellingen/medewerkers")).toBe("Teamleden");
    expect(navTitleForPath("/instellingen/bedrijfsgegevens")).toBe(
      "Bedrijfsgegevens",
    );
  });
});

describe("isOverviewNavPath", () => {
  it("treats list hubs as overviews and nested routes as detail", () => {
    expect(isOverviewNavPath("/overzicht")).toBe(true);
    expect(isOverviewNavPath("/taken")).toBe(true);
    expect(isOverviewNavPath("/leads")).toBe(true);
    expect(isOverviewNavPath("/bedrijven")).toBe(true);
    expect(isOverviewNavPath("/contacten")).toBe(true);
    expect(isOverviewNavPath("/instellingen")).toBe(true);
    expect(isOverviewNavPath("/leads/demo")).toBe(false);
    expect(isOverviewNavPath("/bedrijven/nieuw")).toBe(false);
    expect(isOverviewNavPath("/instellingen/medewerkers")).toBe(false);
    expect(isOverviewNavPath("/instellingen/feedback")).toBe(false);
  });
});

describe("breadcrumbAncestor", () => {
  it("omits breadcrumbs on overview hubs", () => {
    expect(breadcrumbAncestor("/overzicht")).toBeNull();
    expect(breadcrumbAncestor("/leads")).toBeNull();
    expect(breadcrumbAncestor("/instellingen")).toBeNull();
  });

  it("uses the nearest titled ancestor for nested routes", () => {
    expect(breadcrumbAncestor("/leads/demo")).toEqual({
      href: "/leads",
      label: "Leads",
    });
    expect(breadcrumbAncestor("/offertes/Q-1/bewerken")).toEqual({
      href: "/offertes",
      label: "Offertes",
    });
    expect(breadcrumbAncestor("/instellingen/weergave")).toEqual({
      href: "/instellingen",
      label: "Instellingen",
    });
    expect(breadcrumbAncestor("/instellingen/feedback/demo")).toEqual({
      href: "/instellingen/feedback",
      label: "Feedback",
    });
    expect(breadcrumbAncestor("/instellingen/medewerkers/jan")).toEqual({
      href: "/instellingen/medewerkers",
      label: "Teamleden",
    });
  });
});

describe("parentNavPath", () => {
  it("walks one segment up for the compact back button", () => {
    expect(parentNavPath("/leads/demo")).toBe("/leads");
    expect(parentNavPath("/bedrijven/nieuw")).toBe("/bedrijven");
    expect(parentNavPath("/offertes/Q-1/bewerken")).toBe("/offertes/Q-1");
    expect(parentNavPath("/instellingen/medewerkers")).toBe("/instellingen");
    expect(parentNavPath("/instellingen/feedback/demo")).toBe(
      "/instellingen/feedback",
    );
    expect(parentNavPath("/overzicht")).toBe("/overzicht");
  });
});

describe("bottomNavIcon", () => {
  it("uses Users for Leads in the compact bar, shared icons otherwise", () => {
    const leads = appMainNav[2];
    expect(leads?.type).toBe("link");
    expect(bottomNavIcon(leads!)).toBe(Users);
    expect(leads?.type === "link" ? leads.icon : null).toBe(Workflow);
    expect(bottomNavIcon(companiesNavGroup)).toBe(Building2);
  });
});
