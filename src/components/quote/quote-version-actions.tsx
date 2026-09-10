"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import {
  createRevisionAction,
  sendQuoteAction,
  updateQuoteStatusAction,
} from "@/app/(beveiligd)/actions/quote-actions";
import {
  DetailActionMenu,
  detailMenuButtonClassName,
} from "@/components/detail/detail-action-menu";
import { Button } from "@/components/ui/button";
import { pageActionSecondaryClassName } from "@/components/shell/page-header";
import type { QuoteStatus } from "@/generated/prisma/client";
import { quoteEditPath } from "@/lib/paths";

export function QuoteVersionActions({
  quoteId,
  quoteNumber,
  status,
  viewingHistorical,
  pdfHref,
}: {
  quoteId: string;
  quoteNumber: string;
  status: QuoteStatus;
  viewingHistorical: boolean;
  pdfHref: string;
}) {
  const [sendState, sendAction, sendPending] = useActionState(
    sendQuoteAction,
    null,
  );
  const [revisionState, revisionAction, revisionPending] = useActionState(
    createRevisionAction,
    null,
  );
  const [outcomeState, outcomeAction, outcomePending] = useActionState(
    updateQuoteStatusAction,
    null,
  );

  const error =
    sendState?.error ?? revisionState?.error ?? outcomeState?.error ?? null;

  const pdfLink = (
    <a href={pdfHref} className={pageActionSecondaryClassName()}>
      PDF
    </a>
  );

  if (viewingHistorical) {
    return pdfLink;
  }

  const moreItems: ReactNode[] = [];

  if (status === "SENT") {
    moreItems.push(
      <form key="reject" action={outcomeAction} className="w-full">
        <input type="hidden" name="id" value={quoteId} />
        <input type="hidden" name="status" value="REJECTED" />
        <Button
          type="submit"
          variant="ghost"
          className={detailMenuButtonClassName()}
          loading={outcomePending}
        >
          Afwijzen
        </Button>
      </form>,
      <form key="expire" action={outcomeAction} className="w-full">
        <input type="hidden" name="id" value={quoteId} />
        <input type="hidden" name="status" value="EXPIRED" />
        <Button
          type="submit"
          variant="ghost"
          className={detailMenuButtonClassName()}
          loading={outcomePending}
        >
          Markeer als verlopen
        </Button>
      </form>,
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {status === "DRAFT" ? (
          <form action={sendAction}>
            <input type="hidden" name="id" value={quoteId} />
            <Button type="submit" loading={sendPending}>
              Versturen
            </Button>
          </form>
        ) : null}

        {status === "SENT" ? (
          <form action={outcomeAction}>
            <input type="hidden" name="id" value={quoteId} />
            <input type="hidden" name="status" value="ACCEPTED" />
            <Button type="submit" loading={outcomePending}>
              Accepteren
            </Button>
          </form>
        ) : null}

        {status === "SENT" || status === "REJECTED" || status === "EXPIRED" ? (
          <form action={revisionAction}>
            <input type="hidden" name="id" value={quoteId} />
            <Button type="submit" variant="secondary" loading={revisionPending}>
              Nieuwe versie
            </Button>
          </form>
        ) : null}

        {status === "DRAFT" ? (
          <Link
            href={quoteEditPath({ quoteNumber })}
            className={pageActionSecondaryClassName()}
          >
            Bewerken
          </Link>
        ) : null}

        {pdfLink}

        {moreItems.length > 0 ? (
          <DetailActionMenu>{moreItems}</DetailActionMenu>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
