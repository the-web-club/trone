import type { Metadata } from "next";
import Link from "next/link";
import { ThresholdsForm } from "@/components/settings/thresholds-form";
import { PageHeader } from "@/components/shell/page-header";
import { getSessionRole, requireSession } from "@/lib/auth-session";
import { getThresholds } from "@/lib/settings-service";

export const metadata: Metadata = { title: "Drempels" };

export default async function DrempelsPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";
  const thresholds = await getThresholds();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Drempels"
        description={
          <Link href="/instellingen" className="hover:underline">
            Terug naar instellingen
          </Link>
        }
      />
      <p className="max-w-xl text-sm text-fg-muted">
        Deze waarden sturen het kansen-overzicht: hoe lang een lead stil mag
        staan, wanneer een klant rijp is voor opvolging, en vanaf welke
        geschatte waarde een lead als hot-suggestie geldt.
      </p>
      <ThresholdsForm thresholds={thresholds} canManage={canManage} />
    </div>
  );
}
