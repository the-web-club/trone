import { z } from "zod";
import { AppError } from "@/lib/errors";
import { orderStatuses, type OrderStatusFilter } from "@/lib/orders-query";

export const orderStatusSchema = z.enum(orderStatuses);

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

export const createOrderFromQuoteSchema = z.object({
  quoteId: z.string().trim().min(1, "Offerte ontbreekt"),
  itemIds: z
    .array(z.string().trim().min(1, "Regel ontbreekt"))
    .min(1, "Selecteer minstens één regel."),
});

export type CreateOrderFromQuoteInput = z.infer<
  typeof createOrderFromQuoteSchema
>;

export function parseCreateOrderFromQuoteForm(
  formData: FormData,
): CreateOrderFromQuoteInput {
  const parsed = createOrderFromQuoteSchema.safeParse({
    quoteId: formData.get("quoteId"),
    itemIds: formData.getAll("itemId").map(String),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      first?.message ?? "Controleer de geselecteerde regels.",
      "VALIDATION",
    );
  }
  return parsed.data;
}

export function parseOrderId(formData: FormData): string {
  const parsed = z
    .string()
    .trim()
    .min(1, "Order ontbreekt")
    .safeParse(formData.get("id"));
  if (!parsed.success) {
    throw new AppError("Order ontbreekt.", "VALIDATION");
  }
  return parsed.data;
}

export function parseOrderStatusForm(formData: FormData): OrderStatusInput {
  const parsed = orderStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) {
    throw new AppError("Ongeldige productiestatus.", "VALIDATION");
  }
  return parsed.data;
}

export function isOrderStatus(value: string): value is OrderStatusFilter {
  return orderStatuses.includes(value as OrderStatusFilter);
}
