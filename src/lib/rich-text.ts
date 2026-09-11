const LOOKS_LIKE_HTML =
  /<\/?(?:b|strong|i|em|s|strike|del|ul|ol|li|p|div|br|span|font)\b/i;

const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "noscript",
  "iframe",
  "object",
  "embed",
  "head",
  "title",
  "textarea",
]);

const STRUCTURAL = new Set(["p", "div", "ul", "li"]);
const VOID = new Set(["br"]);
const INLINE_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "s",
  "strike",
  "del",
  "span",
  "font",
  "u",
]);

type Marks = { bold: boolean; italic: boolean; strike: boolean };

const TAG_RE =
  /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>/g;

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(Number(dec)),
    )
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&");
}

function extractAttr(tag: string, name: string): string | null {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function marksFromStyle(style: string): Partial<Marks> {
  const marks: Partial<Marks> = {};
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) marks.bold = true;
  if (/font-style\s*:\s*italic/i.test(style)) marks.italic = true;
  if (/text-decoration(?:-line)?\s*:[^;]*line-through/i.test(style)) {
    marks.strike = true;
  }
  return marks;
}

function marksFromTag(name: string, openTag: string): Partial<Marks> {
  const marks: Partial<Marks> = {};
  if (name === "b" || name === "strong") marks.bold = true;
  if (name === "i" || name === "em") marks.italic = true;
  if (name === "s" || name === "strike" || name === "del") marks.strike = true;
  const style = extractAttr(openTag, "style");
  if (style) Object.assign(marks, marksFromStyle(style));
  return marks;
}

function currentMarks(stack: { marks: Partial<Marks> }[]): Marks {
  const marks: Marks = { bold: false, italic: false, strike: false };
  for (const item of stack) {
    if (item.marks.bold) marks.bold = true;
    if (item.marks.italic) marks.italic = true;
    if (item.marks.strike) marks.strike = true;
  }
  return marks;
}

function wrapMarks(text: string, marks: Marks): string {
  if (!text) return "";
  let result = escapeText(text);
  if (marks.strike) result = `<s>${result}</s>`;
  if (marks.italic) result = `<i>${result}</i>`;
  if (marks.bold) result = `<b>${result}</b>`;
  return result;
}

function structuralName(name: string): string | null {
  if (name === "ol") return "ul";
  if (STRUCTURAL.has(name) || VOID.has(name)) return name;
  return null;
}

function closeStructuralUntil(
  stack: string[],
  name: string,
  parts: string[],
): boolean {
  const index = stack.lastIndexOf(name);
  if (index === -1) return false;
  while (stack.length > index) {
    const tag = stack.pop();
    if (tag) parts.push(`</${tag}>`);
  }
  return true;
}

export function sanitizeRichText(html: string): string {
  if (!html) return "";

  const parts: string[] = [];
  const structStack: string[] = [];
  const markStack: { name: string; marks: Partial<Marks> }[] = [];
  let skip: string | null = null;
  let cursor = 0;

  for (const match of html.matchAll(TAG_RE)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const text = html.slice(cursor, index);
    cursor = index + raw.length;

    if (!skip && text) {
      parts.push(wrapMarks(decodeBasicEntities(text), currentMarks(markStack)));
    }

    if (raw.startsWith("<!--")) continue;

    const name = (match[1] ?? "").toLowerCase();
    const closing = raw.startsWith("</");

    if (skip) {
      if (closing && name === skip) skip = null;
      continue;
    }

    if (!closing && DROP_WITH_CONTENT.has(name)) {
      skip = name;
      continue;
    }

    if (INLINE_TAGS.has(name)) {
      if (closing) {
        const markIndex = markStack.map((item) => item.name).lastIndexOf(name);
        if (markIndex !== -1) markStack.splice(markIndex, 1);
      } else {
        markStack.push({ name, marks: marksFromTag(name, raw) });
      }
      continue;
    }

    const emitted = structuralName(name);
    if (!emitted) continue;

    if (VOID.has(emitted)) {
      if (!closing) parts.push("<br>");
      continue;
    }

    if (closing) {
      closeStructuralUntil(structStack, emitted, parts);
      continue;
    }

    if (emitted === "li") {
      closeStructuralUntil(structStack, "li", parts);
    } else if (emitted === "p" || emitted === "div") {
      closeStructuralUntil(structStack, emitted, parts);
    }

    structStack.push(emitted);
    parts.push(`<${emitted}>`);
  }

  if (!skip) {
    const tail = html.slice(cursor);
    if (tail) {
      parts.push(
        wrapMarks(
          decodeBasicEntities(tail),
          currentMarks(markStack),
        ),
      );
    }
  }

  while (structStack.length) {
    const tag = structStack.pop();
    if (tag) parts.push(`</${tag}>`);
  }

  return parts.join("");
}

export function richTextPlain(html: string): string {
  const sanitized = LOOKS_LIKE_HTML.test(html)
    ? sanitizeRichText(html)
    : escapeText(html);
  return decodeBasicEntities(
    sanitized
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isRichTextEmpty(html: string): boolean {
  return richTextPlain(html) === "";
}

export function plainTextToHtml(text: string): string {
  return escapeText(text).replace(/\n/g, "<br>");
}

export function richTextToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!LOOKS_LIKE_HTML.test(trimmed)) return plainTextToHtml(trimmed);
  return sanitizeRichText(value);
}

export function normalizeRichText(value: string): string | undefined {
  if (isRichTextEmpty(value)) return undefined;
  if (!LOOKS_LIKE_HTML.test(value)) {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  const sanitized = sanitizeRichText(value);
  return isRichTextEmpty(sanitized) ? undefined : sanitized;
}
