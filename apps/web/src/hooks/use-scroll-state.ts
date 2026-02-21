"use client";

import { useEffect, useState } from "react";

interface ScrollState {
  isScrolled: boolean;
  scrollY: number;
  direction: "up" | "down" | null;
}

export function useScrollState(threshold = 8): ScrollState {
  const [state, setState] = useState<ScrollState>({
    isScrolled: false,
    scrollY: 0,
    direction: null,
  });

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setState({
        isScrolled: y > threshold,
        scrollY: y,
        direction: y > lastY ? "down" : y < lastY ? "up" : null,
      });
      lastY = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
