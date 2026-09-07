import Link from "next/link";
import type { ReactNode } from "react";
import { formatPersonName } from "@/lib/format";
import { companyPath, contactPath, dealPath } from "@/lib/paths";
import { cn } from "@/lib/cn";

const mutedLinkClass = "hover:underline";
const primaryLinkClass = "font-medium text-fg hover:underline";

export function CompanyLink({
  company,
  className,
  fallback = "—",
  primary = false,
}: {
  company: { slug: string; name: string } | null | undefined;
  className?: string;
  fallback?: ReactNode;
  primary?: boolean;
}) {
  if (!company) return <>{fallback}</>;
  return (
    <Link
      href={companyPath(company)}
      className={cn(primary ? primaryLinkClass : mutedLinkClass, className)}
    >
      {company.name}
    </Link>
  );
}

export function ContactLink({
  contact,
  className,
  fallback = "—",
  primary = false,
}: {
  contact:
    | { slug: string; firstName: string; lastName: string | null }
    | null
    | undefined;
  className?: string;
  fallback?: ReactNode;
  primary?: boolean;
}) {
  if (!contact) return <>{fallback}</>;
  return (
    <Link
      href={contactPath(contact)}
      className={cn(primary ? primaryLinkClass : mutedLinkClass, className)}
    >
      {formatPersonName(contact.firstName, contact.lastName)}
    </Link>
  );
}

export function DealLink({
  deal,
  className,
  fallback = "—",
  primary = false,
}: {
  deal: { slug: string; title: string } | null | undefined;
  className?: string;
  fallback?: ReactNode;
  primary?: boolean;
}) {
  if (!deal) return <>{fallback}</>;
  return (
    <Link
      href={dealPath(deal)}
      className={cn(primary ? primaryLinkClass : mutedLinkClass, className)}
    >
      {deal.title}
    </Link>
  );
}
