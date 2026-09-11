"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SlideFade } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password-validation";

type LoginStatus = "idle" | "loading" | "error";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      const code = result.error.code;
      const isInvalidCredentials =
        code === "INVALID_EMAIL_OR_PASSWORD" ||
        code === "INVALID_EMAIL" ||
        code === "INVALID_PASSWORD" ||
        result.error.status === 401;

      setErrorMessage(
        isInvalidCredentials
          ? "E-mailadres of wachtwoord is onjuist."
          : "Inloggen is tijdelijk niet mogelijk. Probeer het later opnieuw.",
      );
      setStatus("error");
      return;
    }

    router.replace("/overzicht");
    router.refresh();
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <FormField id="email" label="E-mailadres">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          aria-invalid={status === "error" || undefined}
          className="bg-bg focus:border-accent focus-visible:border-accent"
        />
      </FormField>

      <FormField
        id="password"
        label="Wachtwoord"
        aside={
          <Link
            href="/wachtwoord-vergeten"
            className="text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Wachtwoord vergeten?
          </Link>
        }
      >
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          aria-invalid={status === "error" || undefined}
          className="bg-bg focus:border-accent focus-visible:border-accent"
        />
      </FormField>

      <AnimatePresence initial={false}>
        {errorMessage ? (
          <SlideFade>
            <p
              className="rounded-sm border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          </SlideFade>
        ) : null}
      </AnimatePresence>

      <Button type="submit" loading={isLoading} className="w-full">
        Inloggen
      </Button>
    </form>
  );
}
