import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

export function DealHotIcon({ className }: { className?: string }) {
  return (
    <span
      title="Hot"
      className={cn("inline-flex shrink-0 text-warning", className)}
    >
      <Flame className="size-3.5 fill-current" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">Hot</span>
    </span>
  );
}
