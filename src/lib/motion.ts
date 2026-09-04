import type { Transition, Variants } from "framer-motion";

export const MOTION_MS = {
  instant: 100,
  fast: 150,
  base: 200,
  medium: 300,
  slow: 400,
} as const;

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inQuart: [0.5, 0, 0.75, 0] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const SPRING = {
  soft: { type: "spring", stiffness: 300, damping: 30 } as const,
  snappy: { type: "spring", stiffness: 500, damping: 35 } as const,
};

export const MOTION = {
  liftY: -2,
  pressScale: 0.97,
  staggerMs: 30,
  enterY: 8,
  exitY: 4,
  fadeY: 6,
} as const;

const seconds = (ms: number) => ms / 1000;

export const transitions = {
  instant: {
    duration: seconds(MOTION_MS.instant),
    ease: EASE.inOut,
  },
  enter: {
    duration: seconds(MOTION_MS.base),
    ease: EASE.outExpo,
  },
  exit: {
    duration: seconds(MOTION_MS.fast),
    ease: EASE.inQuart,
  },
  move: {
    duration: seconds(MOTION_MS.base),
    ease: EASE.inOut,
  },
  fade: {
    duration: seconds(MOTION_MS.medium),
    ease: EASE.inOut,
  },
} satisfies Record<string, Transition>;

export const reducedTransition: Transition = {
  duration: 0.001,
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: seconds(MOTION.staggerMs),
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: MOTION.enterY },
  show: {
    opacity: 1,
    y: 0,
    transition: transitions.enter,
  },
  exit: {
    opacity: 0,
    y: MOTION.exitY,
    transition: transitions.exit,
  },
};

export const reducedStaggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0 } },
};

export const reducedStaggerItem: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 0 },
};
