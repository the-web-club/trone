export function companyPath(company: { slug: string }): string {
  return `/bedrijven/${company.slug}`;
}

export function contactPath(contact: { slug: string }): string {
  return `/contacten/${contact.slug}`;
}

export function dealPath(deal: { slug: string }): string {
  return `/leads/${deal.slug}`;
}

export function staffPath(user: { slug: string }): string {
  return `/instellingen/medewerkers/${user.slug}`;
}

export function featureRequestListPath(): string {
  return "/instellingen/feedback";
}

export function featureRequestPath(request: { slug: string }): string {
  return `/instellingen/feedback/${request.slug}`;
}

export function quotePath(quote: { quoteNumber: string }): string {
  return `/offertes/${quote.quoteNumber}`;
}

export function quoteEditPath(quote: { quoteNumber: string }): string {
  return `/offertes/${quote.quoteNumber}/bewerken`;
}

export function quotePdfPath(
  quote: { quoteNumber: string },
  opts?: { versie?: number },
): string {
  const base = `/offertes/${quote.quoteNumber}/pdf`;
  if (opts?.versie) return `${base}?versie=${opts.versie}`;
  return base;
}

export function orderPath(order: { orderNumber: string }): string {
  return `/orders/${order.orderNumber}`;
}

export function newQuotePath(opts?: {
  company?: { slug: string } | null;
  deal?: { slug: string } | null;
}): string {
  const params = new URLSearchParams();
  if (opts?.company?.slug) params.set("company", opts.company.slug);
  if (opts?.deal?.slug) params.set("deal", opts.deal.slug);
  const query = params.toString();
  return query ? `/offertes/nieuw?${query}` : "/offertes/nieuw";
}
