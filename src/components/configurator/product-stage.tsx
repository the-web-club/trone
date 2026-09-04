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
        "relative flex min-h-72 items-center justify-center overflow-hidden rounded-xl bg-surface-sunk lg:min-h-[32rem]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        className="size-full max-h-[32rem] object-contain p-8 configurator-image-fade"
      />
    </div>
  );
}
