"use client";

import * as React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  className?: string;
  showName?: boolean;
  name?: string;
}

export function Logo({
  width = 32,
  height = 32,
  className,
  showName = true,
  name = "CtxPort",
  ...props
}: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={width}
        height={height}
        className={className}
        {...props}
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <path
          d="
      M 104 64
      C 80 64, 64 80, 64 104
      L 64 408
      C 64 432, 80 448, 104 448
      L 264 448
      L 264 368
      L 368 368
      L 448 256
      L 368 144
      L 264 144
      L 264 64
      Z
    "
          fill="url(#g)"
        />
        <rect
          x="116"
          y="200"
          width="136"
          height="24"
          rx="12"
          fill="#fff"
          opacity="0.92"
        />
        <rect
          x="116"
          y="244"
          width="108"
          height="24"
          rx="12"
          fill="#fff"
          opacity="0.72"
        />
        <rect
          x="116"
          y="288"
          width="124"
          height="24"
          rx="12"
          fill="#fff"
          opacity="0.52"
        />
      </svg>
      {showName && (
        <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
          {name}
        </span>
      )}
    </div>
  );
}
