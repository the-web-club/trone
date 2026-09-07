"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  useEnterInitial,
  useMotionReady,
} from "@/components/motion/motion-ready";
import {
  useMotionEnabled,
  useStaggerVariants,
} from "@/components/motion/use-motion-enabled";

const motionTags = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  tbody: motion.tbody,
  tr: motion.tr,
  span: motion.span,
} as const;

type MotionTag = keyof typeof motionTags;

export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: MotionTag;
}) {
  const { container } = useStaggerVariants();
  const enabled = useMotionEnabled();
  const Comp = motionTags[as];
  const initial = useEnterInitial(enabled ? "hidden" : false);

  return (
    <Comp
      className={cn(className)}
      variants={container}
      initial={initial}
      animate="show"
    >
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  as?: MotionTag;
} & Record<string, unknown>) {
  const { item } = useStaggerVariants();
  const Comp = motionTags[as];
  const ready = useMotionReady();
  const [layout] = useState(() => (ready ? ("position" as const) : false));

  return (
    <Comp
      className={cn(className)}
      variants={item}
      layout={layout}
      {...props}
    >
      {children}
    </Comp>
  );
}
