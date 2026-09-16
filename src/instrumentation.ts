/**
 * Next.js instrumentatie.
 *
 * `onRequestError` is de plek waar het framework élke onverwachte serverfout
 * langs stuurt: server components, route handlers en server actions. Daardoor
 * hoeft er geen try/catch in ~70 server actions bij om onbekende fouten in het
 * audit-log te krijgen, en wordt de logregel afgewacht door het framework in
 * plaats van als losgelaten promise op een serverless runtime te verdampen.
 *
 * Verwachte fouten (`AppError`: validatie, 403, 404, conflicten) komen hier niet
 * langs — die worden in de actions netjes afgehandeld. Wat hier binnenkomt is
 * dus per definitie onverwacht.
 */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  try {
    const [{ logAuditEvent }, { sanitizeAuditText }] = await Promise.all([
      import("@/lib/audit/log"),
      import("@/lib/audit/sanitize"),
    ]);

    const path = request.path ?? "";
    // De audit-endpoint niet loggen; anders kan een fout daar een lus starten.
    if (path.startsWith("/api/audit-events")) return;

    const isRouteHandler = context.routerKind === "App Router";
    await logAuditEvent({
      eventType: path.startsWith("/api/") ? "API_ERROR" : "SERVER_ERROR",
      category: "ERROR",
      action: path.startsWith("/api/") ? "api.error" : "server.error",
      source: "API",
      result: "FAILURE",
      severity: "ERROR",
      route: path,
      httpMethod: request.method,
      metadata: {
        // Alleen de melding en het type, nooit de stacktrace of de body: daar
        // staan query- en gebruikersgegevens in.
        melding: sanitizeAuditText(
          error instanceof Error ? error.message : String(error),
          200,
        ),
        soort: sanitizeAuditText(
          error instanceof Error ? error.name : "Unknown",
          64,
        ),
        context: sanitizeAuditText(context.routePath, 191),
        renderbron: sanitizeAuditText(context.renderSource, 48),
        router: isRouteHandler ? "app" : "pages",
      },
    });
  } catch {
    // Een fout in de foutlogging mag het foutpad niet verergeren.
  }
};
