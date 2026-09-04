import { PageHeader } from "@/components/shell/page-header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <PageHeader title={title} description="Deze pagina komt binnenkort." />
  );
}
