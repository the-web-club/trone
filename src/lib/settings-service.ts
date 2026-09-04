import "server-only";

import { createId } from "@/lib/id";
import { getPrismaClient } from "@/lib/db";
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

  return getThresholds();
}
