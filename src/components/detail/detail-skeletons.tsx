import { DetailColumns, DetailSection } from "@/components/detail/detail-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-surface-sunk", className)}
    />
  );
}

export function DetailPageHeaderSkeleton({
  action,
}: {
  action?: boolean;
} = {}) {
  return (
    <header className="detail-header">
      <SkeletonPulse className="mb-1 h-4 w-24" />
      <div className="flex items-start justify-between gap-3">
        <SkeletonPulse className="h-7 w-52 sm:h-8" />
        <SkeletonPulse className="h-6 w-16" />
      </div>
      <SkeletonPulse className="mt-1.5 h-4 w-48" />
      {action ? <SkeletonPulse className="mt-3 h-8 w-28" /> : null}
    </header>
  );
}

export function DetailFormSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-1">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-8 w-full" />
        </div>
      ))}
      <SkeletonPulse className="h-8 w-40" />
    </div>
  );
}

export function DetailTableSkeleton({
  columns,
  rows = 4,
}: {
  columns: string[];
  rows?: number;
}) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column}>{column}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index}>
              {columns.map((column, columnIndex) => (
                <TableCell key={column}>
                  <SkeletonPulse
                    className={cn(
                      "h-4",
                      columnIndex === 0 ? "w-40" : "w-24",
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function DetailTimelineSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4" aria-hidden>
      <h2 className="text-md font-medium text-fg">Tijdlijn</h2>
      <SkeletonPulse className={cn("w-full rounded-md", compact ? "h-10" : "h-24")} />
      {compact ? null : (
        <div className="flex flex-col gap-2">
          <SkeletonPulse className="h-16 w-full rounded-md" />
          <SkeletonPulse className="h-16 w-full rounded-md" />
          <SkeletonPulse className="h-16 w-full rounded-md" />
        </div>
      )}
    </section>
  );
}

export function LeadFieldsSkeleton() {
  return (
    <div className="detail-field-grid" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="inline-field">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function CompanyFieldsSkeleton() {
  return (
    <DetailSection title="Gegevens">
      <div className="detail-field-grid" aria-hidden>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="inline-field">
            <SkeletonPulse className="h-3 w-16" />
            <SkeletonPulse className="h-8 w-full" />
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

export function CompanyDetailSkeleton() {
  return (
    <div className="detail-page flex flex-col gap-3 desktop-nav:gap-5" aria-busy="true">
      <DetailPageHeaderSkeleton />
      <DetailColumns
        left={
          <>
            <CompanyFieldsSkeleton />
            <DetailSection title="Contacten">
              <DetailTableSkeleton
                columns={["Naam", "Functie", "E-mail", "Telefoon"]}
                rows={3}
              />
            </DetailSection>
          </>
        }
        right={<DetailTimelineSkeleton compact />}
      />
    </div>
  );
}

export function ContactFieldsSkeleton() {
  return (
    <DetailSection title="Gegevens">
      <div className="detail-field-grid" aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="inline-field">
            <SkeletonPulse className="h-3 w-16" />
            <SkeletonPulse className="h-8 w-full" />
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

export function ContactDetailSkeleton() {
  return (
    <div className="detail-page flex flex-col gap-3 desktop-nav:gap-5" aria-busy="true">
      <DetailPageHeaderSkeleton action />
      <DetailColumns
        left={<ContactFieldsSkeleton />}
        right={<DetailTimelineSkeleton compact />}
      />
    </div>
  );
}

export function LeadDetailSkeleton() {
  return (
    <div className="detail-page flex flex-col gap-3 desktop-nav:gap-5" aria-busy="true">
      <DetailPageHeaderSkeleton action />
      <DetailColumns
        left={
          <>
            <LeadFieldsSkeleton />
            <DetailSection title="Offertes en orders">
              <DetailTableSkeleton
                columns={["Offerte", "Status", "Totaal", "Datum", "Order"]}
                rows={3}
              />
            </DetailSection>
          </>
        }
        right={<DetailTimelineSkeleton compact />}
      />
    </div>
  );
}
