"use client";

import { createContext, useContext, useEffect, useState } from "react";

const MotionReadyContext = createContext(false);

/**
 * False during SSR and the first client render so enter animations do not
 * change markup before hydration. True afterwards, including client navigations.
 */
export function MotionReadyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <MotionReadyContext.Provider value={ready}>
      {children}
    </MotionReadyContext.Provider>
  );
}

export function useMotionReady() {
  return useContext(MotionReadyContext);
}

/**
 * Freeze enter `initial` at mount. First paint matches static HTML; instances
 * that mount after hydration (client navigations, dialogs) still animate.
 */
export function useEnterInitial<T>(animated: T | false): T | false {
  const ready = useMotionReady();
  const [initial] = useState<T | false>(() => (ready ? animated : false));
  return initial;
}
