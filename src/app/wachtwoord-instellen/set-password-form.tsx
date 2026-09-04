"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }

    setPending(true);
    setError(null);

    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setPending(false);

    if (result.error) {
      setError(
        result.error.code === "INVALID_TOKEN"
          ? "Deze uitnodigingslink is ongeldig of verlopen."
          : "Wachtwoord instellen is mislukt. Probeer het opnieuw.",
      );
      return;
    }

    router.replace("/inloggen");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <FormField id="password" label="Wachtwoord">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={5}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
      </FormField>
      <FormField id="confirm" label="Wachtwoord bevestigen">
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={5}
          maxLength={128}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          disabled={pending}
        />
      </FormField>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="w-full">
        Wachtwoord opslaan
      </Button>
    </form>
  );
}
