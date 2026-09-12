"use client";

import {
  type ReactElement,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createFeatureRequestAction } from "@/app/(beveiligd)/actions/feature-request-actions";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FEATURE_REQUEST_DESCRIPTION_HELP,
  FEATURE_REQUEST_DESCRIPTION_MAX,
  FEATURE_REQUEST_TITLE_MAX,
  featureRequestTypeLabels,
  featureRequestTypes,
  validateCreateFeatureRequestFields,
} from "@/lib/feature-request-validation";

export function CreateFeatureRequestDialog({
  trigger,
}: {
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"type" | "title" | "description", string>>
  >({});
  const [state, formAction, pending] = useActionState(
    createFeatureRequestAction,
    null,
  );
  const notifiedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state?.createdAt || notifiedAt.current === state.createdAt) return;
    notifiedAt.current = state.createdAt;
    setOpen(false);
    setType("");
    setTitle("");
    setDescription("");
    setFieldErrors({});
    router.refresh();
  }, [state?.createdAt, router]);

  function resetFields() {
    setType("");
    setTitle("");
    setDescription("");
    setFieldErrors({});
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetFields();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuw verzoek">
              Nieuw verzoek
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuw verzoek</DialogTitle>
          <p className="text-sm text-fg-muted">
            Beschrijf de verbetering. Andere teamleden kunnen meestemmen.
          </p>
        </DialogHeader>
        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            const errors = validateCreateFeatureRequestFields({
              type,
              title,
              description,
            });
            if (Object.keys(errors).length > 0) {
              event.preventDefault();
              setFieldErrors(errors);
            }
          }}
        >
          <DialogBody className="flex flex-col gap-3">
            <FormField id={`${fieldId}-type`} label="Type" error={fieldErrors.type}>
              <Select
                name="type"
                required
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="">Kies een type…</option>
                {featureRequestTypes.map((value) => (
                  <option key={value} value={value}>
                    {featureRequestTypeLabels[value]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id={`${fieldId}-title`}
              label="Titel"
              error={fieldErrors.title}
              aside={
                <span className="text-xs text-fg-subtle tabular-nums">
                  {title.trim().length}/{FEATURE_REQUEST_TITLE_MAX}
                </span>
              }
            >
              <Input
                name="title"
                required
                maxLength={FEATURE_REQUEST_TITLE_MAX}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Korte samenvatting"
              />
            </FormField>
            <FormField
              id={`${fieldId}-description`}
              label="Omschrijving"
              error={fieldErrors.description}
              aside={
                <span className="text-xs text-fg-subtle tabular-nums">
                  {description.length}/{FEATURE_REQUEST_DESCRIPTION_MAX}
                </span>
              }
            >
              <Textarea
                name="description"
                maxLength={FEATURE_REQUEST_DESCRIPTION_MAX}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28"
                aria-describedby={`${fieldId}-description-help`}
              />
            </FormField>
            <p
              id={`${fieldId}-description-help`}
              className="text-xs text-fg-muted"
            >
              {FEATURE_REQUEST_DESCRIPTION_HELP}
            </p>
            {state?.error ? (
              <p className="text-sm text-danger" role="alert">
                {state.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" loading={pending} disabled={pending}>
              Verzoek plaatsen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
