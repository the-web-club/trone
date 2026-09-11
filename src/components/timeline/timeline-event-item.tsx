"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Presentation,
  ShoppingCart,
  SquareCheck,
  StickyNote,
  Users,
  Workflow,
} from "lucide-react";
import {
  deleteTimelineEventAction,
  updateTimelineEventAction,
} from "@/app/(beveiligd)/actions/timeline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { RichText } from "@/components/ui/rich-text";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SelectMenu } from "@/components/ui/select";
import { UserName } from "@/components/user/user-name";
import { formatDateTime, formatPersonName } from "@/lib/format";
import {
  companyPath,
  contactPath,
  dealPath,
  orderPath,
  quotePath,
} from "@/lib/paths";
import {
  isManualTimelineType,
  timelineDirectionLabels,
  timelineEventTypeLabels,
  timelineOutcomeLabels,
  type ManualTimelineType,
  type TimelineDirection,
  type TimelineEventView,
  type TimelineOutcome,
} from "@/lib/timeline-validation";

const typeIcons = {
  NOTE: StickyNote,
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  DEMO: Presentation,
  STAGE_CHANGE: Workflow,
  QUOTE_SENT: FileText,
  QUOTE_ACCEPTED: FileText,
  ORDER_CREATED: ShoppingCart,
  ORDER_STATUS: ShoppingCart,
  TASK_DUE: CheckSquare,
  TASK_DONE: SquareCheck,
  SYSTEM: MessageSquare,
} as const;

const typeTones = {
  NOTE: "default",
  CALL: "default",
  EMAIL: "default",
  MEETING: "default",
  DEMO: "default",
  STAGE_CHANGE: "info",
  QUOTE_SENT: "info",
  QUOTE_ACCEPTED: "success",
  ORDER_CREATED: "info",
  ORDER_STATUS: "info",
  TASK_DUE: "warning",
  TASK_DONE: "success",
  SYSTEM: "default",
} as const;

const manualTypeItems = [
  { value: "NOTE" as const, label: timelineEventTypeLabels.NOTE },
  { value: "CALL" as const, label: timelineEventTypeLabels.CALL },
  { value: "EMAIL" as const, label: timelineEventTypeLabels.EMAIL },
  { value: "MEETING" as const, label: timelineEventTypeLabels.MEETING },
  { value: "DEMO" as const, label: timelineEventTypeLabels.DEMO },
];

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function TimelineEventItem({
  event,
  canEdit = false,
  canDelete = false,
}: {
  event: TimelineEventView;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const Icon = typeIcons[event.type];
  const contactName = event.contact
    ? formatPersonName(event.contact.firstName, event.contact.lastName)
    : null;
  const manual = isManualTimelineType(event.type);
  const showEdit = canEdit && manual;
  const showDelete = canDelete;
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-sm border border-border bg-surface px-2.5 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Icon className="size-3 text-fg-muted" aria-hidden />
        <Badge tone={typeTones[event.type]} className="h-5 px-1.5 text-[11px]">
          {timelineEventTypeLabels[event.type]}
        </Badge>
        {event.direction ? (
          <span className="text-xs text-fg-muted">
            {timelineDirectionLabels[event.direction as TimelineDirection]}
          </span>
        ) : null}
        {event.outcome ? (
          <span className="text-xs text-fg-muted">
            {timelineOutcomeLabels[event.outcome as TimelineOutcome]}
          </span>
        ) : null}
        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-fg-muted">
          {event.user ? (
            <UserName
              name={event.user.name}
              image={event.user.image}
              slug={event.user.slug}
            />
          ) : (
            "Systeem"
          )}
          <span aria-hidden>·</span>
          {formatDateTime(asDate(event.occurredAt))}
        </span>
        {showEdit || showDelete ? (
          <div className="ml-auto flex items-center gap-1">
            {showEdit && !editing ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setEditing(true)}
              >
                Bewerken
              </Button>
            ) : null}
            {showDelete && !editing ? (
              <DeleteTimelineEventButton eventId={event.id} />
            ) : null}
          </div>
        ) : null}
      </div>
      {editing && isManualTimelineType(event.type) ? (
        <TimelineEventEditor
          eventId={event.id}
          type={event.type}
          body={event.body}
          onCancel={() => setEditing(false)}
        />
      ) : event.body ? (
        <RichText
          value={event.body}
          className="mt-0.5 text-sm leading-snug text-fg"
        />
      ) : null}
      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-fg-muted">
        {event.quote ? (
          <Link href={quotePath(event.quote)} className="hover:underline">
            Offerte {event.quote.quoteNumber}
          </Link>
        ) : null}
        {event.order ? (
          <Link href={orderPath(event.order)} className="hover:underline">
            Order {event.order.orderNumber}
          </Link>
        ) : null}
        {event.deal ? (
          <Link href={dealPath(event.deal)} className="hover:underline">
            {event.deal.title}
          </Link>
        ) : null}
        {contactName && event.contact ? (
          <Link
            href={contactPath(event.contact)}
            className="hover:underline"
          >
            {contactName}
          </Link>
        ) : null}
        {event.company ? (
          <Link
            href={companyPath(event.company)}
            className="hover:underline"
          >
            {event.company.name}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TimelineEventEditor({
  eventId,
  type,
  body,
  onCancel,
}: {
  eventId: string;
  type: ManualTimelineType;
  body: string | null;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateTimelineEventAction,
    null,
  );

  useEffect(() => {
    if (state?.savedAt) onCancel();
  }, [state?.savedAt, onCancel]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="id" value={eventId} />
      <FormField id={`type-${eventId}`} label="Type">
        <SelectMenu
          name="type"
          defaultValue={type}
          items={manualTypeItems}
          searchPlaceholder="Zoek een type…"
        />
      </FormField>
      <FormField id={`body-${eventId}`} label="Toelichting">
        <RichTextEditor
          name="body"
          defaultValue={body ?? ""}
          placeholder="Wat is er gebeurd?"
        />
      </FormField>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Opslaan
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}

function DeleteTimelineEventButton({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete(formData: FormData) {
    if (!window.confirm("Deze gebeurtenis verwijderen?")) return;
    setPending(true);
    setError(null);
    const result = await deleteTimelineEventAction(null, formData);
    setPending(false);
    if (result.error) setError(result.error);
  }

  return (
    <form action={onDelete}>
      <input type="hidden" name="id" value={eventId} />
      <Button type="submit" variant="ghost" size="xs" loading={pending}>
        Verwijderen
      </Button>
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
