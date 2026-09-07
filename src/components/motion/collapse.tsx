"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useEnterInitial } from "@/components/motion/motion-ready";
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
        <CollapsePanel
          className={className}
          enabled={enabled}
          enter={enter}
          exit={exit}
        >
          {children}
        </CollapsePanel>
      ) : null}
    </AnimatePresence>
  );
}

function CollapsePanel({
  children,
  className,
  enabled,
  enter,
  exit,
}: {
  children: React.ReactNode;
  className?: string;
  enabled: boolean;
  enter: ReturnType<typeof useMotionTransition>;
  exit: ReturnType<typeof useMotionTransition>;
}) {
  const initial = useEnterInitial(
    enabled ? { height: 0, opacity: 0 } : false,
  );

  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      initial={initial}
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
  const initial = useEnterInitial(
    enabled ? { opacity: 0, scale: 0.98 } : false,
  );

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
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
