import { PageTransition } from "@/components/motion";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

export function AppShell({
  userName,
  userEmail,
  userImage,
  userSlug,
  children,
}: {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userSlug?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-bg text-fg">
      <a
        href="#hoofdinhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[var(--z-toast)] focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-[var(--shadow-pop)]"
      >
        Ga naar inhoud
      </a>
      <AppSidebar
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        userSlug={userSlug}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopbar
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          userSlug={userSlug}
        />
        <main id="hoofdinhoud" className="page-shell">
          <div className="page-shell-inner">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
