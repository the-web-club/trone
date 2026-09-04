import { cn } from "@/lib/cn";

export function AnimatedPrice({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span key={value} className={cn("inline-block configurator-price-update", className)}>
      {value}
    </span>
  );
}
