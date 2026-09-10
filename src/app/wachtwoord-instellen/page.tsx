import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Panel } from "@/components/ui/panel";
import { SetPasswordForm } from "@/app/wachtwoord-instellen/set-password-form";

export const metadata: Metadata = {
  title: "Wachtwoord instellen",
};

export default async function WachtwoordInstellenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const invalid = error === "INVALID_TOKEN" || !token;

  return (
    <main className="flex h-full flex-1 items-center justify-center overflow-y-auto bg-bg px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <BrandLogo className="mb-6 w-44 text-fg" />
          <h1 className="text-2xl font-medium tracking-tight text-fg">
            Wachtwoord instellen
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Kies een nieuw wachtwoord voor je account.
          </p>
        </div>
        <Panel className="p-5">
          {invalid ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-danger" role="alert">
                Deze link is ongeldig of verlopen.
              </p>
              <Link
                href="/inloggen"
                className="text-sm text-fg underline-offset-2 hover:underline"
              >
                Naar inloggen
              </Link>
            </div>
          ) : (
            <SetPasswordForm token={token} />
          )}
        </Panel>
      </div>
    </main>
  );
}
