import { registerBuiltinPlugins, findPlugin } from "@ctxport/core-plugins";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";

// Must register plugins before isSupportedTabUrl can work
registerBuiltinPlugins();

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const MOTION = {
  fast: "150ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
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

type TabState =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "supported"; tabId: number; platformName: string };

function useActiveTab(): TabState {
  const [state, setState] = useState<TabState>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tab = tabs[0];
        if (!tab?.id || !tab.url) {
          setState({ kind: "unsupported" });
          return;
        }

        if (!isSupportedTabUrl(tab.url)) {
          setState({ kind: "unsupported" });
          return;
        }

        const plugin = findPlugin(tab.url);
        setState({
          kind: "supported",
          tabId: tab.id,
          platformName: plugin?.name ?? "AI Chat",
        });
      } catch {
        setState({ kind: "unsupported" });
      }
    })();
  }, []);

  return state;
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

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M 104 64 C 80 64, 64 80, 64 104 L 64 408 C 64 432, 80 448, 104 448 L 264 448 L 264 368 L 368 368 L 448 256 L 368 144 L 264 144 L 264 64 Z"
        fill="url(#logo-g)"
      />
      <rect x="116" y="200" width="136" height="24" rx="12" fill="#fff" opacity="0.92" />
      <rect x="116" y="244" width="108" height="24" rx="12" fill="#fff" opacity="0.72" />
      <rect x="116" y="288" width="124" height="24" rx="12" fill="#fff" opacity="0.52" />
    </svg>
  );
}

/* ---- Popup ---- */

function Popup() {
  const dark = useIsDark();
  const tabState = useActiveTab();
  const [primaryHover, setPrimaryHover] = useState(false);
  const [primaryActive, setPrimaryActive] = useState(false);

  const handleCopyCurrent = async () => {
    if (tabState.kind !== "supported") return;
    try {
      await browser.tabs.sendMessage(tabState.tabId, {
        type: EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT,
      });
    } catch {
      // Content script not ready
    }
    window.close();
  };

  const isSupported = tabState.kind === "supported";

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
        <LogoIcon />
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

      {/* Content area — changes based on tab state */}
      {tabState.kind === "loading" ? (
        <div
          style={{
            textAlign: "center",
            padding: "12px 0",
            fontSize: 12,
            color: dark ? "#6b7280" : "#9ca3af",
          }}
        >
          Checking...
        </div>
      ) : !isSupported ? (
        <UnsupportedState dark={dark} />
      ) : (
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
              fontFamily: FONT_STACK,
              cursor: "pointer",
              textAlign: "left",
              transform: primaryActive ? "scale(0.97)" : "scale(1)",
              transition: `background-color ${MOTION.fast} ${MOTION.easeOut}, transform ${MOTION.fast} ${MOTION.spring}`,
            }}
          >
            <ClipboardIcon />
            Copy Current Conversation
          </button>

          {/* Platform indicator */}
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: dark ? "#4b5563" : "#d1d5db",
              textAlign: "center",
            }}
          >
            {tabState.platformName} detected
          </div>
        </div>
      )}

      {/* Footer */}
      <PopupFooter dark={dark} />
    </div>
  );
}

/* ---- Footer ---- */

const FOOTER_LINKS = [
  { label: "Website", url: "https://ctxport.xiaominglab.com" },
  { label: "Docs", url: "https://ctxport.xiaominglab.com/en/docs/" },
  { label: "Privacy", url: "https://ctxport.xiaominglab.com/en/docs/privacy/" },
  { label: "GitHub", url: "https://github.com/nicepkg/ctxport" },
] as const;

function FooterLink({
  label,
  url,
  dark,
}: {
  label: string;
  url: string;
  dark: boolean;
}) {
  const [hover, setHover] = useState(false);
  const baseColor = dark ? "#6b7280" : "#9ca3af";
  const hoverColor = dark ? "#9ca3af" : "#6b7280";

  return (
    <span
      onClick={() => window.open(url, "_blank")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 11,
        color: hover ? hoverColor : baseColor,
        cursor: "pointer",
        transition: `color ${MOTION.fast} ${MOTION.easeOut}`,
      }}
    >
      {label}
    </span>
  );
}

function PopupFooter({ dark }: { dark: boolean }) {
  return (
    <div
      style={{
        borderTop: dark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
        marginTop: 16,
        paddingTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {FOOTER_LINKS.map((link, i) => (
          <span key={link.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: dark ? "#374151" : "#d1d5db",
                }}
              >
                ·
              </span>
            )}
            <FooterLink label={link.label} url={link.url} dark={dark} />
          </span>
        ))}
      </div>
      <span
        style={{
          fontSize: 10,
          color: dark ? "#374151" : "#d1d5db",
        }}
      >
        v{browser.runtime.getManifest().version}
      </span>
    </div>
  );
}

/* ---- Unsupported site state ---- */

function UnsupportedState({ dark }: { dark: boolean }) {
  const platforms = [
    "ChatGPT",
    "Claude",
    "Gemini",
    "DeepSeek",
    "Grok",
    "GitHub Issues & PRs",
  ];

  return (
    <div>
      <div
        style={{
          textAlign: "center",
          padding: "8px 0 16px",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={dark ? "#4b5563" : "#d1d5db"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ margin: "0 auto 8px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15h8" />
          <circle
            cx="9"
            cy="9"
            r="1"
            fill={dark ? "#4b5563" : "#d1d5db"}
            stroke="none"
          />
          <circle
            cx="15"
            cy="9"
            r="1"
            fill={dark ? "#4b5563" : "#d1d5db"}
            stroke="none"
          />
        </svg>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: dark ? "#9ca3af" : "#6b7280",
            margin: "0 0 4px",
          }}
        >
          Not on a supported page
        </p>
        <p
          style={{
            fontSize: 11,
            color: dark ? "#6b7280" : "#9ca3af",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Open an AI conversation to use CtxPort.
        </p>
      </div>

      <div
        style={{
          borderTop: dark
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
          paddingTop: 12,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: dark ? "#4b5563" : "#d1d5db",
            margin: "0 0 6px",
          }}
        >
          Supported platforms
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {platforms.map((name) => (
            <span
              key={name}
              style={{
                fontSize: 11,
                color: dark ? "#6b7280" : "#9ca3af",
                backgroundColor: dark
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.03)",
                padding: "2px 8px",
                borderRadius: 4,
                border: dark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(0, 0, 0, 0.04)",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
