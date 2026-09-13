"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

const TITLE_SUFFIX = " · TRÔNE Seating";

function readDocumentTitle(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.title.trim();
  if (!raw || raw === "TRÔNE Seating") return null;
  return raw.endsWith(TITLE_SUFFIX)
    ? raw.slice(0, -TITLE_SUFFIX.length).trim()
    : raw;
}

type ChromeContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const ChromeContext = createContext<ChromeContextValue | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [override, setOverride] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  useEffect(() => {
    setOverride(null);
    setDocumentTitle(readDocumentTitle());

    const titleEl = document.querySelector("title");
    if (!titleEl) return;

    const observer = new MutationObserver(() => {
      setDocumentTitle(readDocumentTitle());
    });
    observer.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [pathname]);

  const setTitle = useCallback((title: string | null) => {
    setOverride(title);
  }, []);

  const value = useMemo(
    () => ({ title: override ?? documentTitle, setTitle }),
    [override, documentTitle, setTitle],
  );

  return (
    <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
  );
}

export function useChromeTitle() {
  return useContext(ChromeContext)?.title ?? null;
}

export function ChromeTitle({ title }: { title: string }) {
  const ctx = useContext(ChromeContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setTitle(title);
    return () => ctx.setTitle(null);
  }, [ctx, title]);

  return null;
}
