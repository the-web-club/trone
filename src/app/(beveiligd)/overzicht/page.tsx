import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { getDashboardCounts } from "@/lib/dashboard-service";

export const metadata: Metadata = {
  title: "Overzicht",
};

export default async function OverzichtPage() {
  const counts = await getDashboardCounts();

  const stats = [
    { label: "Bedrijven", value: counts.companies, href: "/bedrijven" },
    { label: "Deals", value: counts.deals, href: "/leads" },
    { label: "Orders", value: counts.orders, href: "/orders" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div className="page-header-copy">
          <h1 className="page-header-title">Overzicht</h1>
          <p className="page-header-description">
            Een snelle stand van de workspace.
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Panel key={stat.label}>
            <p className="text-label font-medium text-fg-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-fg">
              {stat.href ? (
                <Link href={stat.href} className="hover:underline">
                  {stat.value}
                </Link>
              ) : (
                stat.value
              )}
            </p>
          </Panel>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-medium text-fg">Open deals per fase</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.openDealsByStage.map((stage) => (
            <Panel key={stage.id}>
              <p className="text-label font-medium text-fg-muted">{stage.name}</p>
              <p className="mt-1 text-xl font-medium tracking-tight text-fg">
                {stage.count}
              </p>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
