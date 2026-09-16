import { AuditTracker } from "@/components/audit/audit-tracker";
import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth-session";

export default async function BeveiligdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      userSlug={
        "slug" in session.user
          ? ((session.user as { slug?: string | null }).slug ?? null)
          : null
      }
    >
      {/*
        Centrale client-side tracker. Staat hier zodat elke beveiligde pagina
        hem meekrijgt en er geen losse logging per pagina nodig is.
      */}
      <AuditTracker />
      {children}
    </AppShell>
  );
}
