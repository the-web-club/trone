import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  MessageSquarePlus,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Lift } from "@/components/motion";
import { controlMotion } from "@/components/motion/styles";
import { settingsHubModules } from "@/components/shell/nav-config";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { getSessionRole, requireSession } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage() {
  const session = await requireSession();
  const canManage = getSessionRole(session) === "admin";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Instellingen"
        description="Beheer van de interne workspace en verkoopondersteuning."
      />

      <SettingsSection title="Verkoopondersteuning">
        {settingsHubModules.map((item) => (
          <SettingsCard
            key={item.href}
            href={item.href}
            icon={item.icon}
            title={item.label}
            description={
              item.href === "/producten" && !canManage
                ? "Bekijk de catalogus. Alleen een beheerder kan prijzen wijzigen."
                : item.href === "/producten"
                  ? "Catalogusprijzen, swatches en productbeelden."
                  : "Hot leads, stilstand en opvolging van bestaande klanten."
            }
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Workspace">
        <SettingsCard
          href="/instellingen/bedrijfsgegevens"
          icon={Building2}
          title="Bedrijfsgegevens"
          description={
            canManage
              ? "Naam, adres en KvK voor briefpapier op offertes."
              : "Bekijk de gegevens die op offertes staan."
          }
        />
        <SettingsCard
          href="/instellingen/medewerkers"
          icon={Users}
          title="Teamleden"
          description={
            canManage
              ? "Voeg teamleden toe, wijzig rollen en deactiveer accounts."
              : "Bekijk wie toegang heeft tot de workspace."
          }
        />
        <SettingsCard
          href="/instellingen/drempels"
          icon={SlidersHorizontal}
          title="Drempels"
          description={
            canManage
              ? "Pas stilte, opvolging en hot-waarde aan voor het kansen-overzicht."
              : "Bekijk de drempels voor stilte, opvolging en hot leads."
          }
        />
        <SettingsCard
          href="/instellingen/feedback"
          icon={MessageSquarePlus}
          title="Feedback"
          description="Stel verbeteringen voor en stem op ideeën van anderen."
        />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex max-w-lg flex-col gap-3">
      <h2 className="text-md font-medium text-fg">{title}</h2>
      {children}
    </section>
  );
}

function SettingsCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <Lift>
        <Panel className={cn("hover:bg-hover-subtle", controlMotion)}>
          <div className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 text-fg-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">{title}</p>
              <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
            </div>
          </div>
        </Panel>
      </Lift>
    </Link>
  );
}
