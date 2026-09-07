"use client";

import { useEffect, useState } from "react";
import { MOTION_MS } from "@/lib/motion";

const FLASH_MS = MOTION_MS.slow * 4;

export function useSavedFlash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return {
    visible,
    flash: () => setVisible(true),
  };
}
