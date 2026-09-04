import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return <ComingSoon title="Leads" />;
}
