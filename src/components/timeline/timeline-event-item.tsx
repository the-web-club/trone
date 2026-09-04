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
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPersonName } from "@/lib/format";
import type { TimelineEventRecord } from "@/lib/timeline-service";
import { timelineEventTypeLabels } from "@/lib/timeline-validation";

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

export function TimelineEventItem({ event }: { event: TimelineEventRecord }) {
  const Icon = typeIcons[event.type];
  const contactName = event.contact
    ? formatPersonName(event.contact.firstName, event.contact.lastName)
    : null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-3.5 text-fg-muted" aria-hidden />
        <Badge tone={typeTones[event.type]}>
          {timelineEventTypeLabels[event.type]}
        </Badge>
        <span className="text-xs text-fg-muted">
          {event.user?.name ?? "Systeem"}
          {" · "}
          {formatDateTime(event.occurredAt)}
        </span>
      </div>
      {event.body ? (
        <p className="mt-1 text-sm text-fg">{event.body}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
        {event.quote ? (
          <Link href={`/offertes/${event.quote.id}`} className="hover:underline">
            Offerte {event.quote.quoteNumber}
          </Link>
        ) : null}
        {event.order ? (
          <Link href={`/orders/${event.order.id}`} className="hover:underline">
            Order {event.order.orderNumber}
          </Link>
        ) : null}
        {event.deal ? (
          <Link href={`/leads/${event.deal.id}`} className="hover:underline">
            {event.deal.title}
          </Link>
        ) : null}
        {contactName && event.contact ? (
          <Link
            href={`/contacten/${event.contact.id}`}
            className="hover:underline"
          >
            {contactName}
          </Link>
        ) : null}
        {event.company ? (
          <Link
            href={`/bedrijven/${event.company.id}`}
            className="hover:underline"
          >
            {event.company.name}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
