"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useTransition,
  type TransitionStartFunction,
} from "react";

const ListNavigationContext = createContext<{
  isPending: boolean;
  startTransition: TransitionStartFunction;
} | null>(null);

export function ListBrowser({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <ListNavigationContext.Provider value={{ isPending, startTransition }}>
      <div className={className ?? "flex flex-col gap-4"}>{children}</div>
    </ListNavigationContext.Provider>
  );
}

export function useListNavigation() {
  const context = useContext(ListNavigationContext);
  if (!context) {
    throw new Error("useListNavigation moet binnen ListBrowser staan.");
  }
  return context;
}

export function useListHrefReplace() {
  const router = useRouter();
  const { startTransition } = useListNavigation();

  return (href: string) => {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };
}

export function ListBody({ children }: { children: React.ReactNode }) {
  const { isPending } = useListNavigation();
  return (
    <div className="list-body" aria-busy={isPending}>
      {children}
    </div>
  );
}
