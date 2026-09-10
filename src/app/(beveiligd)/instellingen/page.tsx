import type { Metadata } from "next";
import Link from "next/link";
import { Building2, SlidersHorizontal, Users } from "lucide-react";
import { Lift } from "@/components/motion";
import { controlMotion } from "@/components/motion/styles";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { getSessionRole, requireSession } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Instellingen"
        description="Beheer van de interne workspace."
      />

      <div className="flex max-w-lg flex-col gap-3">
      <Link href="/instellingen/bedrijfsgegevens" className="block">
        <Lift>
        <Panel className={cn("hover:bg-hover-subtle", controlMotion)}>
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-4 text-fg-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">Bedrijfsgegevens</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {canManage
                  ? "Naam, adres en KvK voor briefpapier op offertes."
                  : "Bekijk de gegevens die op offertes staan."}
              </p>
            </div>
          </div>
        </Panel>
        </Lift>
      </Link>
      <Link href="/instellingen/medewerkers" className="block">
        <Lift>
        <Panel className={cn("hover:bg-hover-subtle", controlMotion)}>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 text-fg-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">Teamleden</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {canManage
                  ? "Voeg teamleden toe, wijzig rollen en deactiveer accounts."
                  : "Bekijk wie toegang heeft tot de workspace."}
              </p>
            </div>
          </div>
        </Panel>
        </Lift>
      </Link>
      <Link href="/instellingen/drempels" className="block">
        <Lift>
        <Panel className={cn("hover:bg-hover-subtle", controlMotion)}>
          <div className="flex items-start gap-3">
            <SlidersHorizontal className="mt-0.5 size-4 text-fg-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">Drempels</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {canManage
                  ? "Pas stilte, opvolging en hot-waarde aan voor het kansen-overzicht."
                  : "Bekijk de drempels voor stilte, opvolging en hot leads."}
              </p>
            </div>
          </div>
        </Panel>
        </Lift>
      </Link>
      </div>
    </div>
  );
}
