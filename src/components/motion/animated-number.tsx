"use client";

import { animate, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";
import { useMotionEnabled } from "@/components/motion/use-motion-enabled";

export function AnimatedNumber({
  value,
  format = String,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const enabled = useMotionEnabled();
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    if (!enabled) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {
      ...SPRING.soft,
      onUpdate: (next) => {
        setDisplay(format(next));
      },
    });

    return () => controls.stop();
  }, [enabled, format, motionValue, value]);

  return (
    <span className={cn("tabular-nums", className)}>
      {enabled ? display : format(value)}
    </span>
  );
}
