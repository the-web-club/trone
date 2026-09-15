"use client";

import { type ReactElement, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createContactAction } from "@/app/(beveiligd)/actions/contact-actions";
import { CreateCompanyDialog } from "@/components/company/create-company-dialog";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
import { Button } from "@/components/ui/button";
import { ComboboxMenu } from "@/components/ui/combobox";
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
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { Textarea } from "@/components/ui/textarea";
import { safeParseContactForm } from "@/lib/contact-validation";
import { refreshAfterSuccess } from "@/lib/form-submission";
import { contactPath } from "@/lib/paths";

export function CreateContactListDialog({
  companies,
  defaultCompanyId,
  trigger,
}: {
  companies: Array<{ id: string; name: string }>;
  defaultCompanyId?: string;
  trigger?: ReactElement;
}) {
  const id = useId();
  const router = useRouter();
  const form = useFormSubmission({
    pendingLabel: "Toevoegen…",
    successLabel: "Toegevoegd",
  });
  const [open, setOpen] = useState(false);
  const [companyList, setCompanyList] = useState(companies);
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");

  const companyItems = useMemo(
    () => [
      { value: "", label: "Geen bedrijf gekoppeld" },
      ...companyList.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    ],
    [companyList],
  );

  function onOpenChange(next: boolean) {
    if (!next && companyDialogOpen) return;
    form.handleOpenChange(next, (value) => {
      setOpen(value);
      if (!value) {
        setCompanyId(defaultCompanyId ?? "");
        setCompanyQuery("");
        setCompanyDialogOpen(false);
      }
    });
  }

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["firstName", "lastName", "jobTitle", "phone", "email"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseContactForm,
      save: async (data) => {
        const saved = await createContactAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        if (saved.contact) return { result: saved.contact };
        return { error: "Er ging iets mis. Probeer het opnieuw." };
      },
      onSuccess: (contact) => {
        onOpenChange(false);
        router.push(contactPath({ slug: contact.slug }));
        refreshAfterSuccess(() => router.refresh());
      },
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" aria-label="Nieuw contact">
              Nieuw contact
            </Button>
          )
        }
      />
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Nieuw contact</DialogTitle>
          <p className="text-sm text-fg-muted">
            Een bedrijf koppelen kan nu of later.
          </p>
        </DialogHeader>
        <form action={onSubmit} noValidate key={form.submissionId}>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <input type="hidden" name="companyId" value={companyId} />
          <DialogBody className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <FormField id={`${id}-companyId`} label="Bedrijf" className="min-w-0 flex-1">
                <ComboboxMenu
                  id={`${id}-companyId`}
                  value={companyId}
                  onValueChange={setCompanyId}
                  items={companyItems}
                  placeholder="Geen bedrijf gekoppeld"
                  searchPlaceholder="Zoek een bedrijf…"
                  createLabel="Nieuw bedrijf"
                  onCreate={(query) => {
                    setCompanyQuery(query);
                    setCompanyDialogOpen(true);
                  }}
                />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                aria-label="Nieuw bedrijf"
                onClick={() => {
                  setCompanyQuery("");
                  setCompanyDialogOpen(true);
                }}
              >
                Nieuw
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                id={`${id}-firstName`}
                label="Voornaam"
                error={form.shownErrors.firstName}
              >
                <Input
                  name="firstName"
                  autoComplete="given-name"
                  onBlur={() => form.markTouched("firstName")}
                />
              </FormField>
              <FormField id={`${id}-lastName`} label="Achternaam">
                <Input name="lastName" autoComplete="family-name" />
              </FormField>
            </div>
            <FormField id={`${id}-jobTitle`} label="Functie">
              <Input name="jobTitle" />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`${id}-phone`} label="Telefoon">
                <Input name="phone" type="tel" autoComplete="tel" />
              </FormField>
              <FormField
                id={`${id}-email`}
                label="E-mailadres"
                error={form.shownErrors.email}
              >
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  onBlur={() => form.markTouched("email")}
                />
              </FormField>
            </div>
            <FormField id={`${id}-notes`} label="Notities">
              <Textarea name="notes" />
            </FormField>
            {companyId ? (
              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  name="isPrimary"
                  className="size-3.5 rounded-xs border-border accent-fg"
                />
                Primair contact
              </label>
            ) : null}
            <FormStatus error={form.error} statusMessage={form.statusMessage} />
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Toevoegen"
              pendingLabel="Toevoegen…"
              successLabel="Toegevoegd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
      <CreateCompanyDialog
        showTrigger={false}
        open={companyDialogOpen}
        onOpenChange={(next) => {
          setCompanyDialogOpen(next);
          if (!next) setCompanyQuery("");
        }}
        defaultName={companyQuery}
        onCreated={(created) => {
          setCompanyList((list) =>
            list.some((row) => row.id === created.id)
              ? list
              : [...list, { id: created.id, name: created.name }].sort((a, b) =>
                  a.name.localeCompare(b.name, "nl"),
                ),
          );
          setCompanyId(created.id);
        }}
      />
    </DialogRoot>
  );
}
