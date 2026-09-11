import { cn } from "@/lib/cn";
import { isRichTextEmpty, richTextToHtml } from "@/lib/rich-text";

export function RichText({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value || isRichTextEmpty(value)) return null;

  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: richTextToHtml(value) }}
    />
  );
}
