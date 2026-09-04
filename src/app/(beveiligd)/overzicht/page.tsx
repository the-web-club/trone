import type { Metadata } from "next";
import { Panel } from "@/components/ui/panel";
import { getDashboardCounts } from "@/lib/dashboard-service";

export const metadata: Metadata = {
  title: "Overzicht",
};

export default async function OverzichtPage() {
  const counts = await getDashboardCounts();

  const stats = [
    { label: "Bedrijven", value: counts.companies },
    { label: "Deals", value: counts.deals },
    { label: "Orders", value: counts.orders },
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
              {stat.value}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
