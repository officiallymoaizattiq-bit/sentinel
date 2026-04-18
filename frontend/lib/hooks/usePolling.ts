"use client";

import { useEffect, useRef, useState } from "react";

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  initial?: T
) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<unknown>(null);
  const aliveRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const next = await fetcherRef.current();
        if (aliveRef.current) {
          setData(next);
          setError(null);
        }
      } catch (e) {
        if (aliveRef.current) setError(e);
      }
    };

    tick();
    timer = setInterval(tick, intervalMs);

    return () => {
      aliveRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);

  return { data, error };
}
