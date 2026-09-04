import { CrossFadeImage } from "@/components/motion";
import { cn } from "@/lib/cn";

export function ProductStage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-72 items-center justify-center overflow-hidden rounded-xl bg-surface-sunk p-8 lg:min-h-[32rem] lg:p-10",
        className,
      )}
    >
      <CrossFadeImage
        src={src}
        alt={alt}
        className="absolute inset-0"
        imageClassName="p-8 lg:p-10"
      />
    </div>
  );
}
