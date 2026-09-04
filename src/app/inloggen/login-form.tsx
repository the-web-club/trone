"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

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
        />
      </FormField>

      <FormField id="password" label="Wachtwoord">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={5}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          aria-invalid={status === "error" || undefined}
        />
      </FormField>

      {errorMessage ? (
        <p className="text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" loading={isLoading} className="w-full">
        Inloggen
      </Button>
    </form>
  );
}
