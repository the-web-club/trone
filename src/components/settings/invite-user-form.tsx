"use client";

import { useId, useState } from "react";
import { inviteUserAction } from "@/app/(beveiligd)/actions/user-actions";
import { FormStatus } from "@/components/form/form-status";
import { useFormSubmission } from "@/components/form/use-form-submission";
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
import { SelectMenu } from "@/components/ui/select";
import { SubmitStatusButton } from "@/components/ui/submit-status-button";
import { safeParseInviteUserForm, userRoleLabels, userRoles } from "@/lib/user-validation";

export function InviteUserForm() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const form = useFormSubmission({
    pendingLabel: "Uitnodigen…",
    successLabel: "Uitgenodigd",
  });

  async function onSubmit(formData: FormData) {
    await form.submit({
      formData,
      fieldOrder: ["name", "email", "role"],
      fieldElementId: (name) => `${id}-${name}`,
      validate: safeParseInviteUserForm,
      save: async (data) => {
        const saved = await inviteUserAction(null, data);
        if (saved.error) {
          return { error: saved.error, fieldErrors: saved.fieldErrors };
        }
        return { result: true };
      },
      onSuccess: () => form.handleOpenChange(false, setOpen),
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => form.handleOpenChange(next, setOpen)}
    >
      <DialogTrigger
        render={
          <Button variant="primary" aria-label="Teamlid toevoegen">
            Teamlid toevoegen
          </Button>
        }
      />
      <DialogContent size="md">
        <DialogHeader dismissible={form.status !== "submitting"}>
          <DialogTitle>Teamlid uitnodigen</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} noValidate key={form.submissionId}>
          <input type="hidden" name="submissionId" value={form.submissionId} />
          <DialogBody>
            <div className="flex flex-col gap-3">
              <FormField id={`${id}-name`} label="Naam" error={form.shownErrors.name}>
                <Input
                  name="name"
                  autoComplete="name"
                  onBlur={() => form.markTouched("name")}
                />
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
              <FormField id={`${id}-role`} label="Rol" error={form.shownErrors.role}>
                <SelectMenu
                  name="role"
                  defaultValue="user"
                  searchPlaceholder="Zoek een rol…"
                  items={userRoles.map((role) => ({
                    value: role,
                    label: userRoleLabels[role],
                  }))}
                />
              </FormField>
              <FormStatus error={form.error} statusMessage={form.statusMessage} />
            </div>
          </DialogBody>
          <DialogFooter>
            <SubmitStatusButton
              readyLabel="Uitnodigen"
              pendingLabel="Uitnodigen…"
              successLabel="Uitgenodigd"
              status={form.status}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
