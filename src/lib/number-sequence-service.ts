import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

// =====================================================================
// Genereert oplopende order-/offertenummers binnen een transactie.
// Format:
//   orders   -> 2026-00001   (prefix '2026-',   padding 5)
//   offertes -> OFF202600001 (prefix 'OFF2026',  padding 5)
// De reeks-rij wordt met FOR UPDATE gelockt zodat gelijktijdige aanvragen
// geen dubbel nummer krijgen.
// =====================================================================

export async function nextNumber(
  prisma: PrismaClient,
  seqKey: string
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Lock de rij. Raw omdat Prisma geen SELECT ... FOR UPDATE kent.
    // Geparameteriseerd via Prisma.sql, niet via de Unsafe-varianten.
    const rows = await tx.$queryRaw<
      { id: string; prefix: string; lastNumber: number; padding: number }[]
    >(
      Prisma.sql`SELECT id, prefix, lastNumber, padding FROM number_sequence WHERE seqKey = ${seqKey} FOR UPDATE`,
    );
    if (rows.length === 0) {
      throw new Error(`Nummerreeks '${seqKey}' bestaat niet.`);
    }
    const row = rows[0];
    const next = row.lastNumber + 1;
    await tx.$executeRaw(
      Prisma.sql`UPDATE number_sequence SET lastNumber = ${next} WHERE id = ${row.id}`,
    );
    const padded = String(next).padStart(row.padding, "0");
    return `${row.prefix}${padded}`;
  });
}

export const SEQ_ORDER_2026 = "order-2026";
export const SEQ_QUOTE_2026 = "quote-2026";
export const SEQ_INVOICE_2026 = "invoice-2026";
