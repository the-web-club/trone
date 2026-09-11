import { describe, expect, it } from "vitest";
import {
  buildTasksHref,
  parseTasksSearchParams,
} from "@/lib/tasks-query";

describe("tasks query", () => {
  it("omits defaults from the URL", () => {
    expect(
      buildTasksHref({
        zoeken: "",
        eigenaar: "aan-mij",
        afgerond: false,
        wanneer: "alle",
        van: "",
        tot: "",
        pagina: 1,
      }),
    ).toBe("/taken");
  });

  it("includes filters and page only when they differ from defaults", () => {
    expect(
      buildTasksHref({
        zoeken: "opvolgen",
        eigenaar: "alle",
        afgerond: true,
        wanneer: "achterstallig",
        van: "2026-09-01",
        tot: "2026-09-30",
        pagina: 2,
      }),
    ).toBe(
      "/taken?zoeken=opvolgen&eigenaar=alle&afgerond=1&wanneer=achterstallig&van=2026-09-01&tot=2026-09-30&pagina=2",
    );
  });

  it("defaults to own open tasks without completed ones", () => {
    expect(parseTasksSearchParams({})).toEqual({
      zoeken: "",
      eigenaar: "aan-mij",
      afgerond: false,
      wanneer: "alle",
      van: "",
      tot: "",
      pagina: 1,
    });
  });

  it("parses assignee as a user id", () => {
    expect(parseTasksSearchParams({ eigenaar: "user-42" }).eigenaar).toBe(
      "user-42",
    );
  });

  it("toont afgeronde taken via het vinkje", () => {
    expect(parseTasksSearchParams({ afgerond: "1" }).afgerond).toBe(true);
  });

  it("leest oude status=done URL's als afgerond aan", () => {
    expect(parseTasksSearchParams({ status: "done" }).afgerond).toBe(true);
    expect(parseTasksSearchParams({ status: "alle" }).afgerond).toBe(true);
  });
});
