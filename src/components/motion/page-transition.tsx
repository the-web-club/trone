"use client";

import { usePathname } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return <FadeIn key={pathname}>{children}</FadeIn>;
}
