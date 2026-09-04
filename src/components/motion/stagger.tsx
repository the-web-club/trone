"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useStaggerVariants } from "@/components/motion/use-motion-enabled";

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
  const Comp = motionTags[as];

  return (
    <Comp
      className={cn(className)}
      variants={container}
      initial="hidden"
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

  return (
    <Comp
      className={cn(className)}
      variants={item}
      layout="position"
      {...props}
    >
      {children}
    </Comp>
  );
}
