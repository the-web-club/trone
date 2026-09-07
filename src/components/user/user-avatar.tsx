import { cn } from "@/lib/cn";
import { initialsFromName } from "@/lib/format";
import { mediaUrl } from "@/lib/product-visuals";

const sizeClassName = {
  xs: "size-4 text-[9px]",
  sm: "size-5 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-16 text-lg",
} as const;

export type UserAvatarSize = keyof typeof sizeClassName;

export function UserAvatar({
  name,
  image,
  size = "sm",
  className,
}: {
  name: string;
  image?: string | null;
  size?: UserAvatarSize;
  className?: string;
}) {
  const src = image ? mediaUrl(image) : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunk font-medium text-fg-muted",
        sizeClassName[size],
        className,
      )}
      title={name}
      aria-hidden
    >
      {src ? (
        // Private blob URLs go through /api/media; next/image is not used for those.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initialsFromName(name)
      )}
    </span>
  );
}
