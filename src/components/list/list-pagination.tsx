import Link from "next/link";
import { pageActionSecondaryClassName } from "@/components/shell/page-header";

export function ListPagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1 && page <= 1) return null;

  return (
    <nav className="page-pagination" aria-label="Paginering">
      <p className="text-sm text-fg-muted">
        Pagina {page} van {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className={pageActionSecondaryClassName()}>
            Vorige
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className={pageActionSecondaryClassName()}>
            Volgende
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
