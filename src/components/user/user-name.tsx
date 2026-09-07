import Link from "next/link";
import { UserAvatar, type UserAvatarSize } from "@/components/user/user-avatar";
import { cn } from "@/lib/cn";
import { staffPath } from "@/lib/paths";

export function UserName({
  name,
  image,
  slug,
  size = "xs",
  className,
}: {
  name: string;
  image?: string | null;
  slug?: string | null;
  size?: UserAvatarSize;
  className?: string;
}) {
  const content = (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <UserAvatar name={name} image={image} size={size} />
      <span className="min-w-0 truncate">{name}</span>
    </span>
  );

  if (!slug) return content;

  return (
    <Link href={staffPath({ slug })} className="min-w-0 hover:underline">
      {content}
    </Link>
  );
}
