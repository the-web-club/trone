import { PageTransition } from "@/components/motion";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";

export function AppShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
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
      <AppSidebar userName={userName} userEmail={userEmail} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopbar userName={userName} userEmail={userEmail} />
        <main id="hoofdinhoud" className="page-shell">
          <div className="page-shell-inner">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
