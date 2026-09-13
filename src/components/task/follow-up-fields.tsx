"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select";
import { DEFAULT_FOLLOW_UP_TITLE, taskKindLabels } from "@/lib/task-validation";

const followUpKindItems = [
  { value: "FOLLOW_UP", label: taskKindLabels.FOLLOW_UP },
];

export function FollowUpFields({
  dateOnly,
  onDateOnlyChange,
  idPrefix = "",
  dateRequired = false,
  initialKind = "FOLLOW_UP",
  initialTitle = DEFAULT_FOLLOW_UP_TITLE,
  initialDate,
  initialTime = "09:00",
}: {
  dateOnly: boolean;
  onDateOnlyChange: (value: boolean) => void;
  idPrefix?: string;
  dateRequired?: boolean;
  initialKind?: string;
  initialTitle?: string;
  initialDate?: string;
  initialTime?: string;
}) {
  const fieldId = (name: string) => `${idPrefix}${name}`;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField id={fieldId("followUpKind")} label="Type">
          <SelectMenu
            name="followUpKind"
            defaultValue={initialKind}
            items={followUpKindItems}
            searchPlaceholder="Zoek een type…"
          />
        </FormField>
        <FormField id={fieldId("followUpTitle")} label="Titel">
          <Input
            name="followUpTitle"
            defaultValue={initialTitle}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField id={fieldId("followUpDate")} label="Datum">
          <Input
            type="date"
            name="followUpDate"
            required={dateRequired}
            defaultValue={initialDate}
          />
        </FormField>
        {dateOnly ? null : (
          <FormField id={fieldId("followUpTime")} label="Tijd">
            <Input
              type="time"
              name="followUpTime"
              defaultValue={initialTime}
            />
          </FormField>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          name="followUpDateOnly"
          checked={dateOnly}
          onChange={(event) => onDateOnlyChange(event.target.checked)}
          className="size-3.5 rounded-xs border-border accent-fg"
        />
        Alleen datum
      </label>
    </>
  );
}
