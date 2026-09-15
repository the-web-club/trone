import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function DealStagePill({
  name,
  isWon,
  isLost,
  className,
}: {
  name: string;
  isWon: boolean;
  isLost: boolean;
  className?: string;
}) {
  const tone = isWon ? "success" : isLost ? "danger" : "info";
  return (
    <Badge
      tone={tone}
      className={cn("h-auto min-h-5 max-w-full whitespace-normal", className)}
    >
      {name}
    </Badge>
  );
}
