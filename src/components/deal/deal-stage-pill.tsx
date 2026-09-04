import { Badge } from "@/components/ui/badge";

export function DealStagePill({
  name,
  isWon,
  isLost,
}: {
  name: string;
  isWon: boolean;
  isLost: boolean;
}) {
  const tone = isWon ? "success" : isLost ? "danger" : "info";
  return <Badge tone={tone}>{name}</Badge>;
}
