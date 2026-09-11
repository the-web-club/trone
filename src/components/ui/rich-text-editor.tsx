"use client";

import { Bold, Italic, List, Strikethrough } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { controlMotion } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";
import {
  isRichTextEmpty,
  normalizeRichText,
  plainTextToHtml,
  richTextToHtml,
  sanitizeRichText,
} from "@/lib/rich-text";

type FormatCommand = "bold" | "italic" | "strikeThrough" | "insertUnorderedList";

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  list: boolean;
};

const initialFormats: ActiveFormats = {
  bold: false,
  italic: false,
  strike: false,
  list: false,
};

function runCommand(command: FormatCommand) {
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand(command, false);
}

export function RichTextEditor({
  name,
  id,
  defaultValue = "",
  placeholder,
  disabled = false,
  "aria-invalid": ariaInvalid,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const initialHtml = useRef(richTextToHtml(defaultValue));
  const initialValue = normalizeRichText(defaultValue) ?? "";
  const [empty, setEmpty] = useState(() => isRichTextEmpty(defaultValue));
  const [active, setActive] = useState<ActiveFormats>(initialFormats);

  const sync = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = sanitizeRichText(editor.innerHTML);
    const blank = isRichTextEmpty(next);
    if (hiddenRef.current) hiddenRef.current.value = blank ? "" : next;
    setEmpty(blank);
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      strike: document.queryCommandState("strikeThrough"),
      list: document.queryCommandState("insertUnorderedList"),
    });
  }, []);

  const assignEditor = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (!node || node.dataset.richTextReady === "true") return;
    node.innerHTML = initialHtml.current;
    node.dataset.richTextReady = "true";
  }, []);

  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current;
      if (!editor) return;
      const selection = document.getSelection();
      if (!selection || !selection.anchorNode) return;
      if (!editor.contains(selection.anchorNode)) return;
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        strike: document.queryCommandState("strikeThrough"),
        list: document.queryCommandState("insertUnorderedList"),
      });
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  useEffect(() => {
    const form = hiddenRef.current?.closest("form");
    if (!form) return;
    function onSubmit() {
      sync();
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [sync]);

  function apply(command: FormatCommand) {
    if (disabled) return;
    editorRef.current?.focus();
    runCommand(command);
    sync();
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pastedHtml = event.clipboardData.getData("text/html");
    const pastedText = event.clipboardData.getData("text/plain");
    const inserted = pastedHtml
      ? sanitizeRichText(pastedHtml)
      : plainTextToHtml(pastedText);
    document.execCommand("insertHTML", false, inserted || plainTextToHtml(pastedText));
    sync();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      apply("bold");
    } else if (key === "i") {
      event.preventDefault();
      apply("italic");
    } else if (key === "x" && event.shiftKey) {
      event.preventDefault();
      apply("strikeThrough");
    }
  }

  const invalid = ariaInvalid === true || ariaInvalid === "true";

  return (
    <div
      data-field-control=""
      aria-invalid={invalid || undefined}
      className={cn(
        "flex w-full min-h-20 flex-col overflow-hidden rounded-sm border border-border bg-surface text-fg",
        controlMotion,
        "hover:border-border-strong",
        "has-[:focus-visible]:border-fg has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring has-[:focus-visible]:outline-none",
        "aria-invalid:border-danger aria-invalid:has-[:focus-visible]:border-danger aria-invalid:has-[:focus-visible]:ring-ring-danger",
        disabled && "cursor-not-allowed border-border bg-surface-sunk text-fg-muted",
      )}
    >
      <div
        role="toolbar"
        aria-label="Opmaak"
        className="flex shrink-0 items-center justify-start gap-0.5 self-start px-1 pt-1"
      >
        <FormatButton
          label="Vet"
          shortcut="Ctrl+B"
          active={active.bold}
          disabled={disabled}
          onApply={() => apply("bold")}
        >
          <Bold />
        </FormatButton>
        <FormatButton
          label="Cursief"
          shortcut="Ctrl+I"
          active={active.italic}
          disabled={disabled}
          onApply={() => apply("italic")}
        >
          <Italic />
        </FormatButton>
        <FormatButton
          label="Doorhalen"
          shortcut="Ctrl+Shift+X"
          active={active.strike}
          disabled={disabled}
          onApply={() => apply("strikeThrough")}
        >
          <Strikethrough />
        </FormatButton>
        <FormatButton
          label="Opsomming"
          active={active.list}
          disabled={disabled}
          onApply={() => apply("insertUnorderedList")}
        >
          <List />
        </FormatButton>
      </div>
      <div className="relative min-h-0 flex-1">
        {placeholder && empty ? (
          <span className="pointer-events-none absolute top-1 left-2.5 text-sm text-fg-subtle">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={assignEditor}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          aria-invalid={invalid || undefined}
          contentEditable={!disabled}
          className="rich-text min-h-14 px-2.5 pt-1 pb-2 text-sm leading-snug outline-none focus-visible:outline-none"
          onInput={sync}
          onBlur={sync}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          suppressContentEditableWarning
        />
      </div>
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={initialValue}
      />
    </div>
  );
}

function FormatButton({
  label,
  shortcut,
  active,
  disabled,
  onApply,
  children,
}: {
  label: string;
  shortcut?: string;
  active: boolean;
  disabled: boolean;
  onApply: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm text-fg-muted",
        controlMotion,
        "hover:bg-hover hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fg",
        "disabled:pointer-events-none disabled:opacity-45",
        "[&_svg]:size-3.5",
        active && "bg-selected text-fg",
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      {children}
    </button>
  );
}
