import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { requireSession } from "@/lib/auth-session";
import { isAppError } from "@/lib/errors";
import { renderQuotePdf } from "@/lib/quote-pdf";
import { toQuotePdfView } from "@/lib/quote-pdf-data";
import { getQuoteWithVersions } from "@/lib/quote-service";
import { parseQuoteVersionNumber } from "@/lib/quote-validation";
import { getLetterhead } from "@/lib/settings-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireSession();
    const { slug } = await params;
    const quote = await getQuoteWithVersions(slug);
    const versie = new URL(request.url).searchParams.get("versie");
    const versionNumber = versie ? parseQuoteVersionNumber(versie) : undefined;
    const letterhead = await getLetterhead();
    const view = toQuotePdfView(quote, { versionNumber, letterhead });
    const pdf = await renderQuotePdf(view);

    // Een PDF-download is een export van klantgegevens; die hoort in het log.
    await logAuditEvent({
      eventType: "EXPORT_COMPLETED",
      category: "IMPORT_EXPORT",
      action: AUDIT_ACTIONS.quoteExportPdf,
      source: "API",
      httpMethod: "GET",
      route: new URL(request.url).pathname,
      entityType: "quote",
      entityId: quote.id,
      entityLabel: quote.quoteNumber,
      metadata: { versie: versionNumber ?? quote.currentVersionNumber },
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${view.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }
}
