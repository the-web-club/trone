import { describe, expect, it } from "vitest";
import { buildTasksHref, parseTasksSearchParams } from "@/lib/tasks-query";

describe("tasks query helpers", () => {
  it("omits defaults from the URL", () => {
    expect(
      buildTasksHref({
        zoeken: "",
        scope: "aan-mij",
        status: "open",
        van: "",
        tot: "",
        pagina: 1,
      }),
    ).toBe("/taken");
  });

  it("includes active filters and page only when greater than 1", () => {
    expect(
      buildTasksHref({
        zoeken: "bellen",
        scope: "alle",
        status: "done",
        van: "2026-01-01",
        tot: "2026-08-01",
        pagina: 2,
      }),
    ).toBe(
      "/taken?zoeken=bellen&scope=alle&status=done&van=2026-01-01&tot=2026-08-01&pagina=2",
    );
  });

  it("parses search params and falls back to defaults", () => {
    expect(parseTasksSearchParams({})).toEqual({
      zoeken: "",
      scope: "aan-mij",
      status: "open",
      van: "",
      tot: "",
      pagina: 1,
    });
    expect(
      parseTasksSearchParams({
        zoeken: "demo",
        scope: "door-mij",
        status: "unknown",
        pagina: "0",
      }),
    ).toEqual({
      zoeken: "demo",
      scope: "door-mij",
      status: "open",
      van: "",
      tot: "",
      pagina: 1,
    });
  });
});
