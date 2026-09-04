import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/inloggen/login-form";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Panel } from "@/components/ui/panel";
import { getSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Inloggen",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/overzicht");
  }

  return (
    <main className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo className="w-56 text-fg" />
          <h1 className="mt-8 text-2xl font-medium tracking-tight text-fg">
            Inloggen
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Alleen voor het interne team.
          </p>
        </div>
        <Panel className="border-border bg-surface-raised p-6 shadow-sm">
          <LoginForm />
        </Panel>
      </div>
    </main>
  );
}
