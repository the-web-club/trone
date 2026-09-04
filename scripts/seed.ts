import { getPrismaClient } from "@/lib/db";
import { createId } from "@/lib/id";

// =====================================================================
// Seed: pipeline-stages, leadbronnen, nummerreeksen, de 20 optie-assen
// met waarden en prijzen, en de 2 basisproducten (ECS/LAS4.1) met de
// availability-regel (luchtvering alleen bij ECS).
// Idempotent via upsert op natuurlijke sleutels.
// =====================================================================

const prisma = getPrismaClient();

async function main() {
  // --- Pipeline stages ---
  const stages = [
    { name: "Lead", sortOrder: 1 },
    { name: "Contact opgenomen", sortOrder: 2 },
    { name: "Verkoopgesprek", sortOrder: 3 },
    { name: "Offerte", sortOrder: 4 },
    { name: "Fysieke Demo", sortOrder: 5 },
    { name: "Gewonnen", sortOrder: 6, isWon: true },
    { name: "Verloren", sortOrder: 7, isLost: true },
  ];
  for (const s of stages) {
    await prisma.dealStage.upsert({
      where: { name: s.name },
      update: { sortOrder: s.sortOrder, isWon: s.isWon ?? false, isLost: s.isLost ?? false },
      create: { id: createId(), name: s.name, sortOrder: s.sortOrder, isWon: s.isWon ?? false, isLost: s.isLost ?? false },
    });
  }

  // --- Lead sources ---
  for (const name of ["Contactformulier", "Google Ads", "Handmatig", "Beurs", "Telefonisch", "Referral"]) {
    await prisma.leadSource.upsert({
      where: { name },
      update: {},
      create: { id: createId(), name },
    });
  }

  // --- Number sequences ---
  const seqs = [
    { seqKey: "order-2026", prefix: "2026-", year: 2026, padding: 5 },
    { seqKey: "quote-2026", prefix: "OFF2026", year: 2026, padding: 5 },
  ];
  for (const q of seqs) {
    await prisma.numberSequence.upsert({
      where: { seqKey: q.seqKey },
      update: {},
      create: { id: createId(), lastNumber: 0, ...q },
    });
  }

  // --- Options + values ---
  // input: SELECT tenzij anders; boolean-assen krijgen één 'Ja'-waarde.
  type ValueSeed = { value: string; priceDelta?: number; onRequest?: boolean };
  type OptionSeed = {
    code: string;
    name: string;
    input: "SELECT" | "BOOLEAN";
    required?: boolean;
    sort: number;
    values: ValueSeed[];
  };

  const options: OptionSeed[] = [
    { code: "control", name: "Bediening", input: "SELECT", required: true, sort: 1,
      values: [{ value: "Front-control" }, { value: "Side-control" }] },
    { code: "back_height", name: "Rughoogte", input: "SELECT", required: true, sort: 2,
      values: [{ value: "Highback" }, { value: "Lowback" }] },
    { code: "width", name: "Breedte", input: "SELECT", sort: 3,
      values: [{ value: "Standaard" }, { value: "Narrow" }, { value: "XXL" }] },
    { code: "line", name: "Uitvoering", input: "SELECT", sort: 4,
      values: [{ value: "Standaard" }, { value: "Office 24/7" }] },
    { code: "air_suspension", name: "Luchtvering (los, alleen ECS)", input: "SELECT", sort: 5,
      values: [{ value: "Geen" }, { value: "TS95", priceDelta: 950 }, { value: "TS97", priceDelta: 1540 }, { value: "TS120", priceDelta: 840 }, { value: "TS21", priceDelta: 620 }] },
    { code: "fabric", name: "Stoftype / kleur", input: "SELECT", required: true, sort: 6,
      values: [{ value: "100% leder" }, { value: "Stof" }, { value: "PVC" }] },
    { code: "headrest", name: "Hoofdsteun", input: "SELECT", sort: 7,
      values: [{ value: "Met hoofdsteun" }, { value: "Zonder hoofdsteun" }] },
    { code: "stitching", name: "Stiksel", input: "SELECT", sort: 8, values: [{ value: "Standaard" }] },
    { code: "logo_neck", name: "Logo op nekhoogte", input: "BOOLEAN", sort: 9, values: [{ value: "Ja", priceDelta: 0 }] },
    { code: "armrest", name: "Armleuningen", input: "SELECT", sort: 10,
      values: [{ value: "2-direction", priceDelta: 270 }, { value: "4-direction", priceDelta: 270 }, { value: "10-direction", priceDelta: 540 }] },
    { code: "belt", name: "Veiligheidsgordel", input: "SELECT", sort: 11,
      values: [{ value: "2-puntsgordel", priceDelta: 85 }, { value: "3-punts easy-grip", priceDelta: 350 }, { value: "4-puntsgordel", priceDelta: 175 }] },
    { code: "seat_switch", name: "Zitcontactschakelaar", input: "BOOLEAN", sort: 12, values: [{ value: "Ja", priceDelta: 82 }] },
    { code: "turntable", name: "Draaitafel / mechanisch", input: "BOOLEAN", sort: 13, values: [{ value: "Ja", priceDelta: 0, onRequest: true }] },
    { code: "seatlift", name: "Seatlift (elektrisch, +15cm)", input: "BOOLEAN", sort: 14, values: [{ value: "Ja", priceDelta: 800 }] },
    { code: "tilt_adjust", name: "Mechanische hoogte- en kantelverstelling", input: "BOOLEAN", sort: 15, values: [{ value: "Ja", priceDelta: 175 }] },
    { code: "side_adjust", name: "Instelbare zijwangen / rug", input: "BOOLEAN", sort: 16, values: [{ value: "Ja", priceDelta: 210 }] },
    { code: "side_cushion", name: "Instelbaar zijwangenzitkussen", input: "BOOLEAN", sort: 17, values: [{ value: "Ja", priceDelta: 210 }] },
    { code: "climate", name: "Stoelverwarming en/of koeling", input: "SELECT", sort: 18,
      values: [{ value: "Geen" }, { value: "Stoelverwarming", priceDelta: 240 }, { value: "Stoelkoeling", priceDelta: 310 }, { value: "Verwarming + koeling", priceDelta: 550 }] },
    { code: "converter", name: "Omvormer", input: "SELECT", sort: 19,
      values: [{ value: "24>12v", priceDelta: 95 }, { value: "48>12v", priceDelta: 95 }, { value: "72>12v", priceDelta: 145 }] },
    { code: "mount_bracket", name: "Montagesteun (heftruckmerk)", input: "SELECT", sort: 20,
      values: [{ value: "Sittab", priceDelta: 135 }, { value: "Linde", priceDelta: 165 }, { value: "Hyster", priceDelta: 165 }] },
  ];

  const airValueIds: string[] = [];
  let airOptionId = "";

  for (const o of options) {
    const opt = await prisma.productOption.upsert({
      where: { code: o.code },
      update: { name: o.name, inputType: o.input, isRequired: o.required ?? false, sortOrder: o.sort },
      create: { id: createId(), code: o.code, name: o.name, inputType: o.input, isRequired: o.required ?? false, sortOrder: o.sort },
    });
    if (o.code === "air_suspension") airOptionId = opt.id;
    let i = 1;
    for (const v of o.values) {
      // value is niet uniek in schema; we de-dupen op (optionId, value) handmatig.
      const existing = await prisma.optionValue.findFirst({ where: { optionId: opt.id, value: v.value } });
      const data = { priceDelta: v.priceDelta ?? 0, priceOnRequest: v.onRequest ?? false, sortOrder: i };
      const saved = existing
        ? await prisma.optionValue.update({ where: { id: existing.id }, data })
        : await prisma.optionValue.create({ data: { id: createId(), optionId: opt.id, value: v.value, ...data } });
      if (o.code === "air_suspension") airValueIds.push(saved.id);
      i++;
    }
  }

  // --- Products ---
  const products = [
    { sku: "ECS", name: "ECS (statisch)", slug: "ecs", basePrice: 2555, sort: 1 },
    { sku: "LAS4.1", name: "LAS4.1 (luchtgeveerd)", slug: "las4-1", basePrice: 2875, sort: 2 },
  ];
  let ecsId = "";
  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, slug: p.slug, basePrice: p.basePrice, sortOrder: p.sort },
      create: { id: createId(), sku: p.sku, name: p.name, slug: p.slug, basePrice: p.basePrice, sortOrder: p.sort },
    });
    if (p.sku === "ECS") ecsId = prod.id;
  }

  // --- Availability: luchtvering-as alleen bij ECS ---
  if (ecsId && airOptionId) {
    const exists = await prisma.productOptionAvailability.findFirst({
      where: { productId: ecsId, optionId: airOptionId, optionValueId: null },
    });
    if (!exists) {
      await prisma.productOptionAvailability.create({
        data: { id: createId(), productId: ecsId, optionId: airOptionId, optionValueId: null },
      });
    }
  }

  console.log("Seed voltooid.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
