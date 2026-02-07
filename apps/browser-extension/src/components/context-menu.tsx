import type { BundleFormatType } from "@ctxport/core-markdown";
import { useState, useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onSelect: (format: BundleFormatType) => void;
  onClose: () => void;
}

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const MOTION = {
  instant: "100ms",
  fast: "150ms",
  normal: "250ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeIn: "cubic-bezier(0.55, 0, 1, 0.45)",
  springSubtle: "cubic-bezier(0.22, 1.2, 0.36, 1)",
} as const;

/* ---- Format Icons (14x14, currentColor) ---- */

function FullIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="14" height="16" rx="2" />
      <rect x="8" y="2" width="14" height="16" rx="2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="10" x2="16" y2="10" />
      <line x1="4" y1="14" x2="18" y2="14" />
      <line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}

const FORMAT_OPTIONS: {
  label: string;
  value: BundleFormatType;
  icon: React.FC;
}[] = [
  { label: "Copy full conversation", value: "full", icon: FullIcon },
  { label: "User messages only", value: "user-only", icon: UserIcon },
  { label: "Code blocks only", value: "code-only", icon: CodeIcon },
  { label: "Compact", value: "compact", icon: CompactIcon },
];

function useIsDark(): boolean {
  const [dark, setDark] = useState(() => {
    return (
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

export function ContextMenu({ x, y, onSelect, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  const [animatedIn, setAnimatedIn] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Entry animation: two-frame approach
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimatedIn(true);
      });
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose]);

  const menuBaseStyle: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 100001,
    minWidth: 200,
    padding: "4px 0",
    borderRadius: 12,
    backgroundColor: dark
      ? "rgba(44, 44, 46, 0.88)"
      : "rgba(255, 255, 255, 0.88)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: dark
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(0, 0, 0, 0.06)",
    boxShadow: dark
      ? "0 8px 32px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.20)"
      : "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
    fontFamily: FONT_STACK,
    fontSize: 13,
    overflow: "hidden",
    // Animation
    opacity: animatedIn ? 1 : 0,
    transform: animatedIn
      ? "scale(1) translateY(0)"
      : "scale(0.95) translateY(-4px)",
    transition: animatedIn
      ? `opacity ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.normal} ${MOTION.springSubtle}`
      : "none",
  };

  return (
    <div ref={ref} style={menuBaseStyle}>
      {FORMAT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isHovered = hoveredItem === opt.value;
        const isActive = opt.value === "full";

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
            onMouseEnter={() => setHoveredItem(opt.value)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 14px",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive
                ? "var(--primary, #2563eb)"
                : dark
                  ? "#e5e7eb"
                  : "#1f2937",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              lineHeight: 1.4,
              borderRadius: 0,
              backgroundColor: isHovered
                ? dark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.04)"
                : "transparent",
              transition: `background-color ${MOTION.instant} ${MOTION.easeOut}`,
            }}
          >
            <Icon />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
