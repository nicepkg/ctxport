import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const MOTION = {
  instant: "100ms",
  fast: "150ms",
  normal: "250ms",
  smooth: "350ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeIn: "cubic-bezier(0.55, 0, 1, 0.45)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  springSubtle: "cubic-bezier(0.22, 1.2, 0.36, 1)",
} as const;

function useIsDark(): boolean {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

/* ---- Icons (16x16) ---- */

function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="M13 8h8" />
      <rect x="3" y="13" width="6" height="6" rx="1" />
      <path d="M13 16h8" />
    </svg>
  );
}

function LogoIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={dark ? "#60a5fa" : "#2563eb"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

/* ---- Kbd component ---- */

function Kbd({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark: boolean;
}) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontFamily: FONT_STACK,
        fontWeight: 500,
        color: dark ? "#9ca3af" : "#6b7280",
        backgroundColor: dark
          ? "rgba(255, 255, 255, 0.06)"
          : "rgba(0, 0, 0, 0.04)",
        padding: "2px 5px",
        borderRadius: 4,
        border: dark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
      }}
    >
      {children}
    </kbd>
  );
}

/* ---- Popup ---- */

function Popup() {
  const dark = useIsDark();
  const [primaryHover, setPrimaryHover] = useState(false);
  const [primaryActive, setPrimaryActive] = useState(false);
  const [secondaryHover, setSecondaryHover] = useState(false);
  const [secondaryActive, setSecondaryActive] = useState(false);

  const handleCopyCurrent = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id || !isSupportedTabUrl(tab.url)) return;

    await browser.tabs.sendMessage(tab.id, {
      type: EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT,
    });
    window.close();
  };

  const handleToggleBatch = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id || !isSupportedTabUrl(tab.url)) return;

    await browser.tabs.sendMessage(tab.id, {
      type: EXTENSION_RUNTIME_MESSAGE.TOGGLE_BATCH,
    });
    window.close();
  };

  return (
    <div
      style={{
        width: 280,
        padding: 20,
        fontFamily: FONT_STACK,
        backgroundColor: dark ? "#1c1c1e" : "#ffffff",
        color: dark ? "#f9fafb" : "#111827",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <LogoIcon dark={dark} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "inherit",
          }}
        >
          CtxPort
        </span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: dark ? "#9ca3af" : "#6b7280",
          lineHeight: 1.5,
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        Copy AI conversations as Context Bundles.
      </p>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Primary: Copy Current */}
        <button
          type="button"
          onClick={handleCopyCurrent}
          onMouseEnter={() => setPrimaryHover(true)}
          onMouseLeave={() => {
            setPrimaryHover(false);
            setPrimaryActive(false);
          }}
          onMouseDown={() => setPrimaryActive(true)}
          onMouseUp={() => setPrimaryActive(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            backgroundColor: primaryHover ? "#1d4ed8" : "#2563eb",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            transform: primaryActive ? "scale(0.97)" : "scale(1)",
            transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}`,
          }}
        >
          <ClipboardIcon />
          Copy Current Conversation
        </button>

        {/* Secondary: Batch Mode */}
        <button
          type="button"
          onClick={handleToggleBatch}
          onMouseEnter={() => setSecondaryHover(true)}
          onMouseLeave={() => {
            setSecondaryHover(false);
            setSecondaryActive(false);
          }}
          onMouseDown={() => setSecondaryActive(true)}
          onMouseUp={() => setSecondaryActive(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: dark
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(0, 0, 0, 0.10)",
            backgroundColor: secondaryHover
              ? dark
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.03)"
              : "transparent",
            borderColor: secondaryHover
              ? dark
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(0, 0, 0, 0.15)"
              : undefined,
            color: dark ? "#d1d5db" : "#374151",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "left",
            transform: secondaryActive ? "scale(0.97)" : "scale(1)",
            transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, border-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}`,
          }}
        >
          <ChecklistIcon />
          Batch Selection Mode
        </button>
      </div>

      {/* Keyboard Shortcuts Footer */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: dark
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: dark ? "#6b7280" : "#9ca3af",
            lineHeight: 2,
          }}
        >
          <span>Copy current</span>
          <span style={{ display: "flex", gap: 3 }}>
            <Kbd dark={dark}>Cmd</Kbd>
            <Kbd dark={dark}>Shift</Kbd>
            <Kbd dark={dark}>C</Kbd>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: dark ? "#6b7280" : "#9ca3af",
            lineHeight: 2,
          }}
        >
          <span>Batch mode</span>
          <span style={{ display: "flex", gap: 3 }}>
            <Kbd dark={dark}>Cmd</Kbd>
            <Kbd dark={dark}>Shift</Kbd>
            <Kbd dark={dark}>E</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
