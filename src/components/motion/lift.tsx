"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { MOTION, SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/components/motion/use-motion-enabled";

export function Lift({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const enabled = useMotionEnabled();

  return (
    <motion.div
      className={cn(
        "transition-[box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-in-out)]",
        "hover:shadow-[var(--shadow-lift)]",
        className,
      )}
      whileHover={disabled || !enabled ? undefined : { y: MOTION.liftY }}
      transition={SPRING.soft}
      style={{ transformOrigin: "center top" }}
    >
      {children}
    </motion.div>
  );
}
