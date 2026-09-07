"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createRevisionAction,
  sendQuoteAction,
  updateQuoteStatusAction,
} from "@/app/(beveiligd)/actions/quote-actions";
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
      Download PDF
    </a>
  );

  if (viewingHistorical) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pdfLink}
        </div>
        <p className="text-sm text-fg-muted">
          Je bekijkt een eerdere versie. Deze is alleen-lezen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {pdfLink}
        {status === "DRAFT" ? (
          <>
            <Link
              href={quoteEditPath({ quoteNumber })}
              className="inline-flex h-8 items-center rounded-sm border border-border bg-surface px-3 text-sm font-medium text-fg shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-hover"
            >
              Bewerken
            </Link>
            <form action={sendAction}>
              <input type="hidden" name="id" value={quoteId} />
              <Button type="submit" loading={sendPending}>
                Versturen
              </Button>
            </form>
          </>
        ) : null}

        {status === "SENT" || status === "REJECTED" || status === "EXPIRED" ? (
          <form action={revisionAction}>
            <input type="hidden" name="id" value={quoteId} />
            <Button type="submit" loading={revisionPending}>
              Nieuwe versie
            </Button>
          </form>
        ) : null}

        {status === "SENT" ? (
          <>
            <form action={outcomeAction}>
              <input type="hidden" name="id" value={quoteId} />
              <input type="hidden" name="status" value="ACCEPTED" />
              <Button type="submit" variant="secondary" loading={outcomePending}>
                Accepteren
              </Button>
            </form>
            <form action={outcomeAction}>
              <input type="hidden" name="id" value={quoteId} />
              <input type="hidden" name="status" value="REJECTED" />
              <Button type="submit" variant="secondary" loading={outcomePending}>
                Afwijzen
              </Button>
            </form>
            <form action={outcomeAction}>
              <input type="hidden" name="id" value={quoteId} />
              <input type="hidden" name="status" value="EXPIRED" />
              <Button type="submit" variant="ghost" loading={outcomePending}>
                Markeer als verlopen
              </Button>
            </form>
          </>
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
