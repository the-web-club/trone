"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { MOTION } from "@/lib/motion";
import { pressRing } from "@/components/motion/styles";
import {
  useMotionEnabled,
  useMotionTransition,
} from "@/components/motion/use-motion-enabled";

export function Pressable({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const enabled = useMotionEnabled();
  const instant = useMotionTransition("instant");

  return (
    <motion.span
      className={cn("inline-flex max-w-full", pressRing, className)}
      whileTap={
        disabled || !enabled ? undefined : { scale: MOTION.pressScale }
      }
      transition={instant}
      style={{ transformOrigin: "center" }}
    >
      {children}
    </motion.span>
  );
}
