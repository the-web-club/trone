import { isQuoteConfigSnapshot, type QuoteConfigSnapshot } from "@/lib/quote-catalog";
import type { QuoteItemInput } from "@/lib/quote-validation";

export type QuoteVersionLine = {
  productId: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  configSnapshot: QuoteConfigSnapshot | null;
};

export type VersionLineChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type VersionDiff = {
  versionA: number;
  versionB: number;
  totalA: number;
  totalB: number;
  totalDelta: number;
  added: QuoteVersionLine[];
  removed: QuoteVersionLine[];
  changed: {
    before: QuoteVersionLine;
    after: QuoteVersionLine;
    changes: VersionLineChange[];
  }[];
};

export function formatQuoteVersionNumber(
  quoteNumber: string,
  versionNumber: number,
): string {
  if (versionNumber < 1) return quoteNumber;
  return `${quoteNumber}-v${versionNumber}`;
}

export function toQuoteItemInput(item: {
  productId: string;
  quantity: number;
  configSnapshot: unknown;
}): QuoteItemInput | null {
  const snapshot = isQuoteConfigSnapshot(item.configSnapshot)
    ? item.configSnapshot
    : null;
  if (!snapshot) return null;
  return {
    productId: item.productId,
    quantity: item.quantity,
    selections: snapshot.selections.map((selection) => ({
      optionId: selection.optionId,
      optionValueId: selection.optionValueId,
    })),
  };
}

export function toQuoteVersionLine(item: {
  productId: string;
  description: string | null;
  quantity: number;
  unitPrice: { toString(): string } | number;
  lineTotal: { toString(): string } | number;
  configSnapshot: unknown;
}): QuoteVersionLine {
  return {
    productId: item.productId,
    description: item.description,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
    configSnapshot: isQuoteConfigSnapshot(item.configSnapshot)
      ? item.configSnapshot
      : null,
  };
}

function fingerprint(line: QuoteVersionLine): string {
  const ids = (line.configSnapshot?.selections ?? [])
    .map((selection) => selection.optionValueId)
    .sort()
    .join(",");
  return `${line.productId}::${ids}`;
}

function formatDelta(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (rounded === 0) return "€ 0,00";
  const formatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(rounded));
  return rounded > 0 ? `+ ${formatted}` : `− ${formatted}`;
}

export function formatEuroDelta(value: number): string {
  return formatDelta(value);
}

function formatExact(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function optionLabel(line: QuoteVersionLine): string {
  return line.configSnapshot?.productName ?? line.description ?? "Product";
}

function diffLine(
  before: QuoteVersionLine,
  after: QuoteVersionLine,
): VersionLineChange[] {
  const changes: VersionLineChange[] = [];

  if (before.quantity !== after.quantity) {
    changes.push({
      field: "quantity",
      label: "Aantal",
      before: String(before.quantity),
      after: String(after.quantity),
    });
  }

  if (before.unitPrice !== after.unitPrice) {
    changes.push({
      field: "unitPrice",
      label: "Stukprijs",
      before: formatExact(before.unitPrice),
      after: formatExact(after.unitPrice),
    });
  }

  if (before.lineTotal !== after.lineTotal) {
    changes.push({
      field: "lineTotal",
      label: "Regeltotaal",
      before: formatExact(before.lineTotal),
      after: formatExact(after.lineTotal),
    });
  }

  const beforeByOption = new Map(
    (before.configSnapshot?.selections ?? []).map((selection) => [
      selection.optionId,
      selection,
    ]),
  );
  const afterByOption = new Map(
    (after.configSnapshot?.selections ?? []).map((selection) => [
      selection.optionId,
      selection,
    ]),
  );
  const optionIds = new Set([...beforeByOption.keys(), ...afterByOption.keys()]);

  for (const optionId of optionIds) {
    const left = beforeByOption.get(optionId);
    const right = afterByOption.get(optionId);
    if (!left && right) {
      changes.push({
        field: `option:${optionId}`,
        label: right.optionName,
        before: "—",
        after: right.priceOnRequest
          ? `${right.value} (prijs op aanvraag)`
          : right.value,
      });
      continue;
    }
    if (left && !right) {
      changes.push({
        field: `option:${optionId}`,
        label: left.optionName,
        before: left.value,
        after: "—",
      });
      continue;
    }
    if (left && right && left.optionValueId !== right.optionValueId) {
      changes.push({
        field: `option:${optionId}`,
        label: right.optionName || left.optionName,
        before: left.value,
        after: right.value,
      });
    }
  }

  return changes;
}

export function compareVersionLines(
  versionA: number,
  versionB: number,
  totalA: number,
  totalB: number,
  linesA: QuoteVersionLine[],
  linesB: QuoteVersionLine[],
): VersionDiff {
  const usedB = new Set<number>();
  const pairs: { before: QuoteVersionLine; after: QuoteVersionLine }[] = [];
  const removed: QuoteVersionLine[] = [];
  const added: QuoteVersionLine[] = [];

  for (const lineA of linesA) {
    const idx = linesB.findIndex(
      (lineB, index) => !usedB.has(index) && fingerprint(lineA) === fingerprint(lineB),
    );
    if (idx >= 0) {
      usedB.add(idx);
      pairs.push({ before: lineA, after: linesB[idx] });
    }
  }

  for (const lineA of linesA) {
    if (pairs.some((pair) => pair.before === lineA)) continue;
    const idx = linesB.findIndex(
      (lineB, index) => !usedB.has(index) && lineA.productId === lineB.productId,
    );
    if (idx >= 0) {
      usedB.add(idx);
      pairs.push({ before: lineA, after: linesB[idx] });
    } else {
      removed.push(lineA);
    }
  }

  linesB.forEach((lineB, index) => {
    if (!usedB.has(index)) added.push(lineB);
  });

  const changed = pairs
    .map((pair) => ({
      before: pair.before,
      after: pair.after,
      changes: diffLine(pair.before, pair.after),
    }))
    .filter((row) => row.changes.length > 0);

  return {
    versionA,
    versionB,
    totalA,
    totalB,
    totalDelta: Math.round((totalB - totalA + Number.EPSILON) * 100) / 100,
    added,
    removed,
    changed,
  };
}

export function lineTitle(line: QuoteVersionLine): string {
  return optionLabel(line);
}
