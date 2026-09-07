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
      {children}
    </AppShell>
  );
}
