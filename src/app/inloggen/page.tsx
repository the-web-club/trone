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
    <main className="flex h-full flex-1 items-center justify-center overflow-y-auto bg-bg px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-sm font-medium tracking-tight text-fg">
            TRÔNE Seating
          </p>
          <h1 className="mt-4 text-2xl font-medium tracking-tight text-fg">
            Inloggen
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Alleen voor het interne team.
          </p>
        </div>
        <Panel className="p-5">
          <LoginForm />
        </Panel>
      </div>
    </main>
  );
}
