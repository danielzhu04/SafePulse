import { useEffect, useRef } from "react";

export function usePolling(fn: () => void, ms: number, enabled: boolean) {
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fn();
    ref.current = setInterval(fn, ms);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [enabled, ms, fn]);
}
