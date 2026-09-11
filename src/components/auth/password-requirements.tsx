import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPasswordRules } from "@/lib/password-validation";

export const PASSWORD_REQUIREMENTS_ID = "password-requirements";

export function PasswordRequirements({
  password,
  confirm,
}: {
  password: string;
  confirm?: string;
}) {
  const rules = getPasswordRules(password, confirm);

  return (
    <ul
      id={PASSWORD_REQUIREMENTS_ID}
      className="flex flex-col gap-1"
      aria-live="polite"
    >
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            rule.met ? "text-success-dot" : "text-fg-subtle",
          )}
        >
          {rule.met ? (
            <Check className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <Circle className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="sr-only">
            {rule.met ? "Voldaan: " : "Nog niet voldaan: "}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
