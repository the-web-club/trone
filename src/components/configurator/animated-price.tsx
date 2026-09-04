import { AnimatedNumber } from "@/components/motion";
import { cn } from "@/lib/cn";
import { formatEuroExact } from "@/lib/format";

export function AnimatedPrice({
  value,
  suffix,
  className,
}: {
  value: number | null;
  suffix?: string;
  className?: string;
}) {
  if (value == null) {
    return <span className={cn(className)}>—</span>;
  }

  return (
    <span className={cn(className)}>
      <AnimatedNumber value={value} format={formatEuroExact} />
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}
