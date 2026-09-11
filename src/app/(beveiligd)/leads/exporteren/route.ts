import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-session";
import { exportDealsCsv } from "@/lib/deal-service";
import { parseDealsSearchParams } from "@/lib/deals-query";
import { isAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const parsed = parseDealsSearchParams(
      Object.fromEntries(url.searchParams.entries()),
    );

    const result = await exportDealsCsv(
      {
        zoeken: parsed.zoeken,
        stageId: parsed.fase || undefined,
        sourceId: parsed.bron || undefined,
        eigenaar: parsed.eigenaar,
        status: parsed.status,
        waardeMin: parsed.waardeMin || undefined,
        waardeMax: parsed.waardeMax || undefined,
        van: parsed.van || undefined,
        tot: parsed.tot || undefined,
        datumveld: parsed.datumveld,
        sortering: parsed.sortering,
        leadscore: parsed.leadscore,
      },
      session.user.id,
    );

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Total": String(result.total),
        "X-Export-Capped": result.capped ? "1" : "0",
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
