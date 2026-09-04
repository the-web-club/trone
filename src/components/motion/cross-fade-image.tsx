"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  useMotionEnabled,
  useMotionTransition,
} from "@/components/motion/use-motion-enabled";

export function CrossFadeImage({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  const enabled = useMotionEnabled();
  const fade = useMotionTransition("fade");

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence initial={false} mode="sync">
        <motion.img
          key={src}
          src={src}
          alt={alt}
          initial={enabled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={enabled ? { opacity: 0 } : undefined}
          transition={fade}
          className={cn(
            "absolute inset-0 m-auto max-h-full max-w-full object-contain object-center",
            imageClassName,
          )}
        />
      </AnimatePresence>
    </div>
  );
}
