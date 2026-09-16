"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderNavLink,
  pageActionSecondaryClassName,
} from "@/components/shell/page-header";
import { Panel } from "@/components/ui/panel";

/**
 * Errorstate van de logpagina.
 *
 * Dekt twee gevallen: een database die niet meelevert, en een niet-beheerder die
 * de route rechtstreeks opent (`assertCanViewAuditLog` gooit dan een 403). De
 * melding blijft algemeen: een foutpagina hoort geen intern detail te lekken.
 */
export default function LogsError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Logs"
        nav={
          <PageHeaderNavLink href="/instellingen">
            Terug naar instellingen
          </PageHeaderNavLink>
        }
      />
      <Panel className="flex flex-col items-start gap-3">
        <div>
          <p className="text-sm font-medium text-fg">
            De logs konden niet worden geladen.
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            Mogelijk heb je geen beheerdersrechten, of is de verbinding met de
            database tijdelijk weg. Probeer het opnieuw.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => reset()}>
            Opnieuw proberen
          </Button>
          <Link href="/instellingen" className={pageActionSecondaryClassName()}>
            Naar instellingen
          </Link>
        </div>
      </Panel>
    </div>
  );
}
