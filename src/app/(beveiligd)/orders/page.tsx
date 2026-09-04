import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return <ComingSoon title="Orders" />;
}
