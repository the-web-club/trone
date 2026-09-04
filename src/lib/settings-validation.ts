import { z } from "zod";
import { AppError } from "@/lib/errors";

export const thresholdsSchema = z.object({
  stilDagen: z.coerce
    .number()
    .int()
    .min(1, "Stilte moet minstens 1 dag zijn"),
  opvolgingMaanden: z.coerce
    .number()
    .int()
    .min(1, "Opvolging moet minstens 1 maand zijn"),
  hotWaarde: z.coerce
    .number()
    .min(0, "Hot-waarde moet 0 of hoger zijn"),
});

export type ThresholdsInput = z.infer<typeof thresholdsSchema>;

export function parseThresholdsForm(formData: FormData): ThresholdsInput {
  const parsed = thresholdsSchema.safeParse({
    stilDagen: formData.get("stilDagen"),
    opvolgingMaanden: formData.get("opvolgingMaanden"),
    hotWaarde: formData.get("hotWaarde"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(first?.message ?? "Controleer het formulier.", "VALIDATION");
  }

  return parsed.data;
}
