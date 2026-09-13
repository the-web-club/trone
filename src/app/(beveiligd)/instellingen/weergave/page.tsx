import type { Metadata } from "next";
import { ThemePreferenceForm } from "@/components/settings/theme-preference-form";
import { PageHeader, PageHeaderNavLink } from "@/components/shell/page-header";
import { requireSession } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Weergave" };

export default async function WeergavePage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Weergave"
        nav={
          <PageHeaderNavLink href="/instellingen">
            Terug naar instellingen
          </PageHeaderNavLink>
        }
        description="Kies licht, donker of de systeemvoorkeur. Deze keuze hoort bij je account."
      />
      <ThemePreferenceForm />
    </div>
  );
}
