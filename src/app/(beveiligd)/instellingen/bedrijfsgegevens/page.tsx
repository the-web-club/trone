import type { Metadata } from "next";
import Link from "next/link";
import { LetterheadForm } from "@/components/settings/letterhead-form";
import { PageHeader } from "@/components/shell/page-header";
import { getSessionRole, requireSession } from "@/lib/auth-session";
import { getLetterhead } from "@/lib/settings-service";

export const metadata: Metadata = { title: "Bedrijfsgegevens" };

export default async function BedrijfsgegevensPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";
  const letterhead = await getLetterhead();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bedrijfsgegevens"
        description={
          <Link href="/instellingen" className="hover:underline">
            Terug naar instellingen
          </Link>
        }
      />
      <p className="max-w-xl text-sm text-fg-muted">
        Deze gegevens komen op offertes. Lege velden blijven leeg.
      </p>
      <LetterheadForm letterhead={letterhead} canManage={canManage} />
    </div>
  );
}
