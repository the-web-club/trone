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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain object-center configurator-image-fade"
      />
    </div>
  );
}
