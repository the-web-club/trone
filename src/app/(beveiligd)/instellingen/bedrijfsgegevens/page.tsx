import type { Metadata } from "next";
import { LetterheadForm } from "@/components/settings/letterhead-form";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import { getSessionRole, requireSession } from "@/lib/auth-session";
import { getLetterhead } from "@/lib/settings-service";

export const metadata: Metadata = { title: "Bedrijfsgegevens" };

export default async function BedrijfsgegevensPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";
  const letterhead = await getLetterhead();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Bedrijfsgegevens"
        nav={
          <PageHeaderNavLink href="/instellingen">
            Terug naar instellingen
          </PageHeaderNavLink>
        }
        description="Deze gegevens komen op offertes. Lege velden blijven leeg."
      />
      <LetterheadForm letterhead={letterhead} canManage={canManage} />
    </div>
  );
}
