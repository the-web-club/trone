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
        status: "open",
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
        status: "done",
        wanneer: "achterstallig",
        van: "2026-09-01",
        tot: "2026-09-30",
        pagina: 2,
      }),
    ).toBe(
      "/taken?zoeken=opvolgen&eigenaar=alle&status=done&wanneer=achterstallig&van=2026-09-01&tot=2026-09-30&pagina=2",
    );
  });

  it("defaults to own open tasks", () => {
    expect(parseTasksSearchParams({})).toEqual({
      zoeken: "",
      eigenaar: "aan-mij",
      status: "open",
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
});
