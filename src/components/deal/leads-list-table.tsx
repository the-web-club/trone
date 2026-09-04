import Link from "next/link";
import { DealStagePill } from "@/components/deal/deal-stage-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyRow,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEuro, formatPersonName } from "@/lib/format";

export type LeadsListRow = {
  id: string;
  title: string;
  companyName: string | null;
  contactName: string | null;
  stageName: string;
  isWon: boolean;
  isLost: boolean;
  valueEstimate: number | null;
  sourceName: string | null;
  ownerName: string | null;
  createdAt: string;
};

export function LeadsListTable({
  rows,
  emptyMessage,
}: {
  rows: LeadsListRow[];
  emptyMessage: string;
}) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Titel</TableHeaderCell>
            <TableHeaderCell>Bedrijf</TableHeaderCell>
            <TableHeaderCell>Fase</TableHeaderCell>
            <TableHeaderCell align="right">Waarde</TableHeaderCell>
            <TableHeaderCell>Bron</TableHeaderCell>
            <TableHeaderCell>Eigenaar</TableHeaderCell>
            <TableHeaderCell>Datum</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={7}>{emptyMessage}</TableEmptyRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} interactive>
                <TableCell>
                  <Link
                    href={`/leads/${row.id}`}
                    className="font-medium text-fg hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.contactName ? (
                    <p className="text-xs text-fg-muted">{row.contactName}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {row.companyName ?? "—"}
                </TableCell>
                <TableCell>
                  <DealStagePill
                    name={row.stageName}
                    isWon={row.isWon}
                    isLost={row.isLost}
                  />
                </TableCell>
                <TableCell align="right" className="tabular-nums">
                  {formatEuro(row.valueEstimate) ?? "—"}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {row.sourceName ?? "—"}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {row.ownerName ?? "Niet toegewezen"}
                </TableCell>
                <TableCell className="text-fg-muted whitespace-nowrap">
                  {formatDate(new Date(row.createdAt))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function formatListContactName(
  contact: { firstName: string; lastName: string | null } | null,
): string | null {
  if (!contact) return null;
  return formatPersonName(contact.firstName, contact.lastName) || null;
}
