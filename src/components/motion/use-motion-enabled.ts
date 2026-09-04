"use client";

import { useReducedMotion } from "framer-motion";
import {
  reducedStaggerContainer,
  reducedStaggerItem,
  reducedTransition,
  staggerContainer,
  staggerItem,
  transitions,
} from "@/lib/motion";

export function useMotionEnabled() {
  return useReducedMotion() !== true;
}

export function useMotionTransition(kind: keyof typeof transitions) {
  const enabled = useMotionEnabled();
  return enabled ? transitions[kind] : reducedTransition;
}

export function useStaggerVariants() {
  const enabled = useMotionEnabled();
  return enabled
    ? { container: staggerContainer, item: staggerItem }
    : { container: reducedStaggerContainer, item: reducedStaggerItem };
}
