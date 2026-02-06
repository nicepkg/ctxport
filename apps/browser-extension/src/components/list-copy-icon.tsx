import { useState, useCallback, useRef, useEffect } from "react";
import { findAdapterByHostUrl } from "@ctxport/core-adapters/manifest";
import {
  serializeConversation,
  type BundleFormatType,
} from "@ctxport/core-markdown";
import { writeToClipboard } from "~/lib/utils";
import { ContextMenu } from "./context-menu";

type IconState = "idle" | "loading" | "success" | "error";

interface ListCopyIconProps {
  conversationId: string;
  onToast: (message: string, type: "success" | "error") => void;
}

export function ListCopyIcon({
  conversationId,
  onToast,
}: ListCopyIconProps) {
  const [state, setState] = useState<IconState>("idle");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doCopy = useCallback(
    async (format: BundleFormatType = "full") => {
      if (state === "loading") return;
      setState("loading");

      try {
        const adapter = findAdapterByHostUrl(window.location.href);
        if (!adapter) throw new Error("No adapter found for current page");

        const conv = await adapter.fetchById(conversationId);
        const serialized = serializeConversation(conv, { format });
        await writeToClipboard(serialized.markdown);

        if (!mountedRef.current) return;
        setState("success");

        const tokenStr =
          serialized.estimatedTokens >= 1000
            ? `~${(serialized.estimatedTokens / 1000).toFixed(1)}K`
            : `~${serialized.estimatedTokens}`;
        onToast(
          `Copied ${serialized.messageCount} messages \u00b7 ${tokenStr} tokens`,
          "success",
        );

        setTimeout(() => {
          if (mountedRef.current) setState("idle");
        }, 1500);
      } catch (err) {
        if (!mountedRef.current) return;
        setState("error");
        onToast(
          "Fetch failed. Please open the conversation and use the in-page copy button.",
          "error",
        );
        setTimeout(() => {
          if (mountedRef.current) setState("idle");
        }, 3000);
      }
    },
    [conversationId, state, onToast],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void doCopy("full");
    },
    [doCopy],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={state === "loading"}
        title="Copy this conversation (CtxPort)"
        className="ctxport-list-copy-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          padding: 0,
          border: "none",
          borderRadius: 4,
          background: "transparent",
          cursor: state === "loading" ? "wait" : "pointer",
          color: iconColor(state),
          transition: "color 150ms ease, opacity 150ms ease",
          flexShrink: 0,
        }}
      >
        <SmallIcon state={state} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onSelect={(format) => {
            void doCopy(format);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

function iconColor(state: IconState): string {
  switch (state) {
    case "success":
      return "#16a34a";
    case "error":
      return "#ea580c";
    default:
      return "var(--text-secondary, currentColor)";
  }
}

function SmallIcon({ state }: { state: IconState }) {
  if (state === "loading") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }
  if (state === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (state === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
