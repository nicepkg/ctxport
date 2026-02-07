"use client";

import { cn } from "@ui/utils/common";
import * as React from "react";

export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("sr-only", className)} {...props} />
));

VisuallyHidden.displayName = "VisuallyHidden";
