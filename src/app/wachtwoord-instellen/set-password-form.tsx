"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  PasswordRequirements,
  PASSWORD_REQUIREMENTS_ID,
} from "@/components/auth/password-requirements";
import { SlideFade } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  isPasswordValid,
  passwordApiErrorMessage,
  passwordValidationMessage,
} from "@/lib/password-validation";

const inputClassName =
  "bg-bg focus:border-accent focus-visible:border-accent";

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = passwordValidationMessage(password, confirm);
    if (validationError || !isPasswordValid(password, confirm)) {
      setError(validationError ?? "Controleer het wachtwoord.");
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
      setError(passwordApiErrorMessage(result.error.code));
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
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          disabled={pending}
          aria-describedby={PASSWORD_REQUIREMENTS_ID}
          className={inputClassName}
        />
      </FormField>
      <FormField id="confirm" label="Wachtwoord bevestigen">
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setError(null);
          }}
          disabled={pending}
          aria-describedby={PASSWORD_REQUIREMENTS_ID}
          className={inputClassName}
        />
      </FormField>
      <PasswordRequirements password={password} confirm={confirm} />
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
        Wachtwoord opslaan
      </Button>
    </form>
  );
}
