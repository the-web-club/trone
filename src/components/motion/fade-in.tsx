"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { MOTION } from "@/lib/motion";
import {
  useMotionEnabled,
  useMotionTransition,
} from "@/components/motion/use-motion-enabled";

export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const enter = useMotionTransition("enter");
  const exit = useMotionTransition("exit");

  return (
    <motion.div
      className={cn(className)}
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={enabled ? { opacity: 0, transition: exit } : undefined}
      transition={enter}
      style={{ transformOrigin: "center top" }}
    >
      {children}
    </motion.div>
  );
}

export function SlideFade({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const enter = useMotionTransition("enter");
  const exit = useMotionTransition("exit");

  return (
    <motion.div
      className={cn(className)}
      initial={enabled ? { opacity: 0, y: MOTION.fadeY } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={enabled ? { opacity: 0, y: MOTION.exitY, transition: exit } : undefined}
      transition={enter}
      style={{ transformOrigin: "center top" }}
    >
      {children}
    </motion.div>
  );
}
