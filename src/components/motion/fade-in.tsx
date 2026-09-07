"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { MOTION } from "@/lib/motion";
import { useEnterInitial } from "@/components/motion/motion-ready";
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
  const initial = useEnterInitial(enabled ? { opacity: 0 } : false);

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
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
  const initial = useEnterInitial(
    enabled ? { opacity: 0, y: MOTION.fadeY } : false,
  );

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      exit={enabled ? { opacity: 0, y: MOTION.exitY, transition: exit } : undefined}
      transition={enter}
      style={{ transformOrigin: "center top" }}
    >
      {children}
    </motion.div>
  );
}
