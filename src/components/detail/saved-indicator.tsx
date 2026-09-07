import { cn } from "@/lib/cn";
import { controlMotion } from "@/components/motion/styles";

export function SavedIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "text-xs text-fg-muted",
        controlMotion,
        visible ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0",
      )}
      aria-live="polite"
    >
      {visible ? "Opgeslagen" : null}
    </span>
  );
}
