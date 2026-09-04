"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  useMotionEnabled,
  useMotionTransition,
} from "@/components/motion/use-motion-enabled";

export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const enter = useMotionTransition("enter");
  const exit = useMotionTransition("exit");

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className={cn("overflow-hidden", className)}
          initial={enabled ? { height: 0, opacity: 0 } : false}
          animate={{ height: "auto", opacity: 1 }}
          exit={
            enabled
              ? { height: 0, opacity: 0, transition: exit }
              : undefined
          }
          transition={enter}
          style={{ transformOrigin: "center top" }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Expand({
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
      initial={enabled ? { opacity: 0, scale: 0.98 } : false}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        enabled
          ? { opacity: 0, scale: 0.98, transition: exit }
          : undefined
      }
      transition={enter}
      style={{ transformOrigin: "var(--transform-origin, center top)" }}
    >
      {children}
    </motion.div>
  );
}
