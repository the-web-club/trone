import { DetailPageHeaderSkeleton, DetailTableSkeleton } from "@/components/detail/detail-skeletons";

export default function MedewerkerDetailLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <DetailPageHeaderSkeleton action />
      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Leads</h2>
        <DetailTableSkeleton columns={["Lead", "Bedrijf", "Contact", "Fase"]} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-md font-medium text-fg">Bedrijven</h2>
        <DetailTableSkeleton columns={["Bedrijf", "Plaats", "Koppeling"]} />
      </section>
    </div>
  );
}
