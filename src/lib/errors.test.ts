import { describe, expect, it } from "vitest";
import { describeError } from "@/lib/errors";

describe("describeError", () => {
  it("leest naam en melding van een gewone fout", () => {
    const error = new Error("Verbinding verbroken");
    error.name = "PrismaClientInitializationError";

    expect(describeError(error)).toEqual({
      soort: "PrismaClientInitializationError",
      melding: "Verbinding verbroken",
      code: null,
    });
  });

  it("pakt de foutcode die Prisma meestuurt", () => {
    const error = Object.assign(new Error("Timed out fetching a connection"), {
      code: "P2024",
    });

    expect(describeError(error).code).toBe("P2024");
  });

  it("valt terug op errno wanneer er geen code-string is", () => {
    const error = Object.assign(new Error("read ECONNRESET"), { errno: -4077 });

    expect(describeError(error).code).toBe("-4077");
  });

  it("gooit het codefragment van Prisma weg en houdt de databasefout over", () => {
    const error = Object.assign(
      new Error(
        [
          "",
          "Invalid `db[model].findFirst()` invocation in",
          "/app/node_modules/@better-auth/prisma-adapter/dist/index.mjs:191:36",
          "",
          "  190 const selects = convertSelect(select, model, join);",
          "→ 191 const result = await db[model].findFirst(",
          "Database error. Code: `45028`. Message: `pool timeout: failed to retrieve a connection from pool after 10014ms",
          "    (pool connections: active=0 idle=0 limit=5)`",
        ].join("\n"),
      ),
      { code: "P2039" },
    );

    const { melding } = describeError(error);

    expect(melding).toBe(
      "Invalid `db[model].findFirst()` invocation in " +
        "Database error. Code: `45028`. Message: `pool timeout: failed to " +
        "retrieve a connection from pool after 10014ms " +
        "(pool connections: active=0 idle=0 limit=5)`",
    );
    expect(melding.length).toBeLessThanOrEqual(256);
  });

  it("verwerkt iets dat helemaal geen fout is", () => {
    expect(describeError("kapot")).toEqual({
      soort: "string",
      melding: "kapot",
      code: null,
    });
  });
});
