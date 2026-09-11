import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/ui/panel";
import { getDashboardCounts } from "@/lib/dashboard-service";
import { formatEuro } from "@/lib/format";
import { listSummary } from "@/lib/list-copy";

export const metadata: Metadata = {
  title: "Overzicht",
};

export default async function OverzichtPage() {
  const counts = await getDashboardCounts();
  const pipelineLabel = formatEuro(counts.pipelineValue) ?? "€ 0";

  const stats = [
    { label: "Bedrijven", value: counts.companies, href: "/bedrijven" },
    { label: "Leads", value: counts.deals, href: "/leads" },
    { label: "Orders", value: counts.orders, href: "/orders" },
    { label: "Pipeline", value: pipelineLabel, href: "/leads" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Overzicht"
        description="Een snelle stand van de workspace."
        meta={[
          listSummary(counts.companies, "bedrijf", "bedrijven"),
          listSummary(counts.deals, "lead", "leads"),
          listSummary(counts.orders, "order", "orders"),
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Panel key={stat.label}>
            <p className="text-label font-medium text-fg-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-fg tabular-nums">
              <Link href={stat.href} className="hover:underline">
                {stat.value}
              </Link>
            </p>
          </Panel>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-medium text-fg">Open leads per fase</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.openDealsByStage.map((stage) => (
            <Panel key={stage.id}>
              <p className="text-label font-medium text-fg-muted">{stage.name}</p>
              <p className="mt-1 text-xl font-medium tracking-tight text-fg">
                {stage.count}
              </p>
              {stage.count > 0 || stage.value > 0 ? (
                <p className="mt-0.5 text-sm text-fg-muted tabular-nums">
                  {formatEuro(stage.value) ?? "€ 0"}
                </p>
              ) : null}
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
