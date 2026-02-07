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
  name = "Chat2Poster",
  ...props
}: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={width}
        height={height}
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <rect width="256" height="256" fill="none" />
        <defs>
          <linearGradient
            id="logo-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* Chat bubble */}
        <path
          d="M40 32 h136 a24 24 0 0 1 24 24 v80 a24 24 0 0 1 -24 24 h-88 l-40 40 v-40 h-8 a24 24 0 0 1 -24 -24 v-80 a24 24 0 0 1 24 -24 z"
          fill="url(#logo-gradient)"
        />

        {/* Chat lines */}
        <rect
          x="56"
          y="72"
          width="88"
          height="12"
          rx="6"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="56"
          y="100"
          width="64"
          height="12"
          rx="6"
          fill="white"
          opacity="0.7"
        />
        <rect
          x="56"
          y="128"
          width="80"
          height="12"
          rx="6"
          fill="white"
          opacity="0.5"
        />

        {/* Image frame at bottom right */}
        <rect
          x="152"
          y="168"
          width="80"
          height="64"
          rx="8"
          fill="url(#logo-gradient)"
        />
        <rect
          x="160"
          y="176"
          width="64"
          height="48"
          rx="4"
          fill="white"
          opacity="0.9"
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
