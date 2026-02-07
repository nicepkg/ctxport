import { useCallback, useState, useEffect, useRef } from "react";
import { useBatchContext } from "./batch-provider";
import type { BundleFormatType } from "@ctxport/core-markdown";

interface BatchBarProps {
  onToast: (message: string, type: "success" | "error") => void;
}

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const MOTION = {
  instant: "100ms",
  fast: "150ms",
  normal: "250ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

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

export function BatchBar({ onToast }: BatchBarProps) {
  const { state, selected, result, progress, copySelected, toggleBatchMode } =
    useBatchContext();
  const [format, setFormat] = useState<BundleFormatType>("full");
  const [copyHover, setCopyHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const dark = useIsDark();

  const handleCopy = useCallback(async () => {
    await copySelected(format);
  }, [copySelected, format]);

  if (state === "normal") return null;

  const bgColor = (() => {
    if (state === "success") return "rgba(5, 150, 105, 0.06)";
    if (state === "partial-fail") return "rgba(220, 38, 38, 0.06)";
    return dark ? "rgba(28, 28, 30, 0.85)" : "rgba(255, 255, 255, 0.85)";
  })();

  // Notify via toast when done
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;

    if (state === "success" && result) {
      const tokenStr =
        result.estimatedTokens >= 1000
          ? `~${(result.estimatedTokens / 1000).toFixed(1)}K`
          : `~${result.estimatedTokens}`;
      onToast(
        `Copied ${result.succeeded} conversations (${result.messageCount} messages \u00b7 ${tokenStr} tokens)`,
        "success",
      );
    } else if (state === "partial-fail" && result) {
      onToast(
        `Copied ${result.succeeded}/${result.total} conversations (${result.failed} failed)`,
        "error",
      );
    }
  }, [state, result, onToast]);

  const progressPercent =
    state === "copying" && progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0;

  const isDisabled = selected.size === 0;

  return (
    <div
      className="ctxport-batch-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        backdropFilter: "blur(12px) saturate(150%)",
        WebkitBackdropFilter: "blur(12px) saturate(150%)",
        backgroundColor: bgColor,
        borderBottom: dark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
        fontFamily: FONT_STACK,
        fontSize: 13,
        color: dark ? "#d1d5db" : "#374151",
      }}
    >
      {state === "copying" ? (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Copying... {progress.current}/{progress.total}
        </span>
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {selected.size} selected
        </span>
      )}

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        {state === "selecting" && (
          <>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as BundleFormatType)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: dark
                  ? "1px solid rgba(255, 255, 255, 0.12)"
                  : "1px solid rgba(0, 0, 0, 0.10)",
                background: dark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.02)",
                color: dark ? "#d1d5db" : "#374151",
                fontSize: 12,
                fontFamily: FONT_STACK,
              }}
            >
              <option value="full">Full</option>
              <option value="user-only">User Only</option>
              <option value="code-only">Code Only</option>
              <option value="compact">Compact</option>
            </select>

            <button
              type="button"
              onClick={handleCopy}
              disabled={isDisabled}
              onMouseEnter={() => setCopyHover(true)}
              onMouseLeave={() => setCopyHover(false)}
              style={{
                padding: "5px 14px",
                borderRadius: 8,
                border: "none",
                backgroundColor: isDisabled
                  ? dark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(0, 0, 0, 0.06)"
                  : "var(--primary, #2563eb)",
                color: isDisabled
                  ? dark
                    ? "rgba(255, 255, 255, 0.25)"
                    : "rgba(0, 0, 0, 0.25)"
                  : "#fff",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT_STACK,
                cursor: isDisabled ? "default" : "pointer",
                transform:
                  copyHover && !isDisabled ? "scale(0.97)" : "scale(1)",
                transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}`,
              }}
            >
              Copy All
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleBatchMode}
          onMouseEnter={() => setCancelHover(true)}
          onMouseLeave={() => setCancelHover(false)}
          style={{
            padding: "5px 14px",
            borderRadius: 8,
            border: dark
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(0, 0, 0, 0.10)",
            background: cancelHover
              ? dark
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.03)"
              : "transparent",
            color: dark ? "#9ca3af" : "#6b7280",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: FONT_STACK,
            cursor: "pointer",
            transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, border-color ${MOTION.fast} ${MOTION.easeOut}`,
          }}
        >
          Cancel
        </button>
      </div>

      {/* Progress bar */}
      {state === "copying" && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            width: `${progressPercent}%`,
            backgroundColor: "var(--primary, #2563eb)",
            borderRadius: 1,
            transition: `width ${MOTION.normal} ${MOTION.easeOut}`,
          }}
        />
      )}
    </div>
  );
}
