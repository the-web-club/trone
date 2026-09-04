import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { getSessionRole, requireSession } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Instellingen</h1>
          <p className="page-header-description">
            Beheer van de interne workspace.
          </p>
        </div>
      </header>

      <Link href="/instellingen/medewerkers" className="block max-w-lg">
        <Panel className="transition-colors duration-[var(--motion-fast)] hover:bg-hover-subtle">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 text-fg-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">Medewerkers</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {canManage
                  ? "Voeg teamleden toe, wijzig rollen en deactiveer accounts."
                  : "Bekijk wie toegang heeft tot de workspace."}
              </p>
            </div>
          </div>
        </Panel>
      </Link>
    </div>
  );
}
