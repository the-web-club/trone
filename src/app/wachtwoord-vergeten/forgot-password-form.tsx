"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { requestPasswordResetAction } from "@/app/wachtwoord-vergeten/actions";
import { SlideFade } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const inputClassName =
  "bg-bg focus:border-accent focus-visible:border-accent";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await requestPasswordResetAction(null, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-muted">
          Als dit e-mailadres bij ons bekend is, ontvang je een link om een
          nieuw wachtwoord in te stellen.
        </p>
        <Link
          href="/inloggen"
          className="text-sm text-fg underline-offset-2 hover:underline"
        >
          Terug naar inloggen
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="flex w-full flex-col gap-4">
      <FormField id="email" label="E-mailadres">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          className={inputClassName}
        />
      </FormField>

      <AnimatePresence initial={false}>
        {error ? (
          <SlideFade>
            <p
              className="rounded-sm border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          </SlideFade>
        ) : null}
      </AnimatePresence>

      <Button type="submit" loading={pending} className="w-full">
        Verstuur resetlink
      </Button>

      <Link
        href="/inloggen"
        className="text-center text-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline"
      >
        Terug naar inloggen
      </Link>
    </form>
  );
}
