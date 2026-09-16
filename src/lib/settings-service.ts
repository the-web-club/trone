import "server-only";

import { logAuditEvent } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/registry";
import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
import {
  parseLetterheadJson,
  type Letterhead,
} from "@/lib/letterhead";
import {
  SETTING_KEYS,
  thresholdsFromRows,
  type Thresholds,
} from "@/lib/settings";
import type { ThresholdsInput } from "@/lib/settings-validation";

export async function getThresholds(): Promise<Thresholds> {
  const prisma = getPrismaClient();
  const rows = await prisma.appSetting.findMany();
  return thresholdsFromRows(rows);
}

export async function getLetterhead(): Promise<Letterhead> {
  const prisma = getPrismaClient();
  const row = await prisma.appSetting.findUnique({
    where: { key: SETTING_KEYS.letterhead },
  });
  return parseLetterheadJson(row?.value);
}

export async function updateLetterhead(input: Letterhead) {
  const prisma = getPrismaClient();
  const current = await getLetterhead();
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEYS.letterhead },
    update: { value: JSON.stringify(input) },
    create: {
      id: createId(),
      key: SETTING_KEYS.letterhead,
      value: JSON.stringify(input),
    },
  });
  const letterhead = await getLetterhead();
  await logAuditEvent({
    eventType: "UPDATE",
    category: "SETTINGS",
    action: AUDIT_ACTIONS.settingsLetterhead,
    entityType: "appSetting",
    entityId: SETTING_KEYS.letterhead,
    entityLabel: "Briefhoofd",
    // Alleen wélke velden veranderden: het adres zelf hoort niet in het log.
    metadata: { velden: changedLetterheadFields(current, letterhead) },
  });
  return letterhead;
}

/** Namen van de gewijzigde briefhoofdvelden; bewust zonder de waarden zelf. */
function changedLetterheadFields(before: Letterhead, after: Letterhead): string[] {
  return (Object.keys(after) as Array<keyof Letterhead>).filter(
    (field) => before[field] !== after[field],
  );
}

export async function updateThresholds(input: ThresholdsInput) {
  const prisma = getPrismaClient();
  const entries = [
    { key: SETTING_KEYS.stilDagen, value: String(input.stilDagen) },
    { key: SETTING_KEYS.opvolgingMaanden, value: String(input.opvolgingMaanden) },
    { key: SETTING_KEYS.hotWaarde, value: String(input.hotWaarde) },
  ];

  for (const entry of entries) {
    await prisma.appSetting.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: { id: createId(), key: entry.key, value: entry.value },
    });
  }

  const thresholds = await getThresholds();
  await logAuditEvent({
    eventType: "UPDATE",
    category: "SETTINGS",
    action: AUDIT_ACTIONS.settingsThresholds,
    entityType: "appSetting",
    entityLabel: "Drempelwaarden",
    // Drempels zijn getallen, geen persoonsgegevens: waarden mogen mee.
    metadata: {
      stilDagen: thresholds.stilDagen,
      opvolgingMaanden: thresholds.opvolgingMaanden,
      hotWaarde: thresholds.hotWaarde,
    },
  });
  return thresholds;
}
