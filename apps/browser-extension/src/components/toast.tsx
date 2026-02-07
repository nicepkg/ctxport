import { useState, useEffect, useRef } from "react";

export interface ToastData {
  message: string;
  type: "success" | "error";
}

interface ToastProps {
  data: ToastData | null;
  onDismiss: () => void;
}

// ── Design Tokens ──────────────────────────────────────────────

const MOTION = {
  instant: "100ms",
  fast: "150ms",
  normal: "250ms",
  smooth: "350ms",
  emphasis: "500ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeIn: "cubic-bezier(0.55, 0, 1, 0.45)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  springSubtle: "cubic-bezier(0.22, 1.2, 0.36, 1)",
  snapOut: "cubic-bezier(0, 0.7, 0.3, 1)",
} as const;

const COLORS = {
  success: { light: "#059669", dark: "#34d399" },
  successBg: {
    light: "rgba(5, 150, 105, 0.12)",
    dark: "rgba(52, 211, 153, 0.12)",
  },
  successBorder: {
    light: "rgba(5, 150, 105, 0.20)",
    dark: "rgba(52, 211, 153, 0.20)",
  },
  error: { light: "#dc2626", dark: "#f87171" },
  errorBg: {
    light: "rgba(220, 38, 38, 0.10)",
    dark: "rgba(248, 113, 113, 0.10)",
  },
  errorBorder: {
    light: "rgba(220, 38, 38, 0.20)",
    dark: "rgba(248, 113, 113, 0.20)",
  },
} as const;

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// ── Dark Mode Detection ────────────────────────────────────────

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => detectDark());
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setIsDark(detectDark());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDark;
}

function detectDark(): boolean {
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// ── Icons ──────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line
        x1="12"
        y1="8"
        x2="12"
        y2="13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="16.5"
        r="0.5"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

// ── Toast Component ────────────────────────────────────────────

type Phase = "entering" | "visible" | "exiting";

export function Toast({ data, onDismiss }: ToastProps) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [current, setCurrent] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isDark = useIsDark();

  useEffect(() => {
    if (!data) {
      // If there was an active toast, trigger exit
      if (current) {
        setPhase("exiting");
        timerRef.current = setTimeout(() => {
          setCurrent(null);
          setPhase(null);
          onDismiss();
        }, 250); // exit animation duration
      }
      return;
    }

    // New toast data arrived
    setCurrent(data);
    setPhase("entering");

    // Double rAF to ensure browser paints the initial frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("visible");
      });
    });

    // Auto-dismiss timer
    const duration = data.type === "success" ? 2000 : 4000;
    timerRef.current = setTimeout(() => {
      setPhase("exiting");
      setTimeout(() => {
        setCurrent(null);
        setPhase(null);
        onDismiss();
      }, 250);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data]);

  if (!current || phase === null) return null;

  const isSuccess = current.type === "success";
  const mode = isDark ? "dark" : "light";

  const color = isSuccess ? COLORS.success[mode] : COLORS.error[mode];
  const bg = isSuccess ? COLORS.successBg[mode] : COLORS.errorBg[mode];
  const border = isSuccess
    ? COLORS.successBorder[mode]
    : COLORS.errorBorder[mode];

  // Compute transform + opacity + transition based on phase
  let opacity: number;
  let transform: string;
  let transition: string;

  switch (phase) {
    case "entering":
      opacity = 0;
      transform = "translateY(-100%)";
      transition = "none";
      break;
    case "visible":
      opacity = 1;
      transform = "translateY(0)";
      transition = `opacity ${MOTION.normal} ${MOTION.easeOut}, transform ${MOTION.smooth} ${MOTION.spring}`;
      break;
    case "exiting":
      opacity = 0;
      transform = "translateY(-20px)";
      transition = `opacity ${MOTION.fast} ${MOTION.easeIn}, transform ${MOTION.normal} ${MOTION.easeIn}`;
      break;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 99999,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 20px",
          marginTop: 12,
          borderRadius: 12,
          pointerEvents: "auto",
          fontFamily: FONT_STACK,
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.4,
          maxWidth: 480,
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
          backgroundColor: bg,
          border: `1px solid ${border}`,
          color,
          opacity,
          transform,
          transition,
        }}
      >
        {isSuccess ? <SuccessIcon /> : <ErrorIcon />}
        <span>{current.message}</span>
      </div>
    </div>
  );
}
