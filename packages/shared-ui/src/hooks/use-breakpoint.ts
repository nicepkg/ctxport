"use client";

import * as React from "react";

export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>("lg");

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.sm) {
        setBreakpoint("sm");
      } else if (width < BREAKPOINTS.md) {
        setBreakpoint("md");
      } else if (width < BREAKPOINTS.lg) {
        setBreakpoint("lg");
      } else if (width < BREAKPOINTS.xl) {
        setBreakpoint("xl");
      } else {
        setBreakpoint("2xl");
      }
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
}

export function useIsBreakpoint(target: Breakpoint): boolean {
  const current = useBreakpoint();
  const order: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
  return order.indexOf(current) <= order.indexOf(target);
}

export function useIsDesktop(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "md";
}
