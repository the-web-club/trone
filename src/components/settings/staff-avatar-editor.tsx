"use client";

import { useRef, useState } from "react";
import { updateUserAvatarAction } from "@/app/(beveiligd)/actions/user-actions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";

export function StaffAvatarEditor({
  userId,
  name,
  image,
  canEdit,
}: {
  userId: string;
  name: string;
  image: string | null;
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateUserAvatarAction(formData);
    setPending(false);
    if (result.error) setError(result.error);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (!canEdit) {
    return <UserAvatar name={name} image={image} size="lg" />;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-70"
        aria-label="Avatar wijzigen"
      >
        <UserAvatar name={name} image={image} size="lg" />
      </button>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const formData = new FormData();
          formData.set("userId", userId);
          formData.set("file", file);
          void submit(formData);
        }}
      />
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          loading={pending}
          onClick={() => inputRef.current?.click()}
        >
          {image ? "Wijzigen" : "Avatar toevoegen"}
        </Button>
        {image ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={pending}
            onClick={() => {
              const formData = new FormData();
              formData.set("userId", userId);
              formData.set("remove", "true");
              void submit(formData);
            }}
          >
            Verwijderen
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
