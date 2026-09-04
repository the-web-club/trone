import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/inloggen/login-form";
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
    <main className="flex min-h-full flex-1 items-center justify-center overflow-y-auto px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/trone-seating-logo.png"
            alt="TRÔNE Seating"
            width={300}
            height={102}
            className="h-auto w-[13.5rem]"
          />
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
