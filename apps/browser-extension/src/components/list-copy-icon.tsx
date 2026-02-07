import { useState, useCallback, useRef, useEffect } from "react";
import { findPlugin } from "@ctxport/core-plugins";
import {
  serializeConversation,
  type BundleFormatType,
} from "@ctxport/core-markdown";
import { writeToClipboard } from "~/lib/utils";
import { ContextMenu } from "./context-menu";

const MOTION = {
  instant: '100ms',
  fast: '150ms',
  normal: '250ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSubtle: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
} as const;

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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [iconAnimated, setIconAnimated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Trigger icon scale-in animation on success/error
  useEffect(() => {
    if (state === "success" || state === "error") {
      setIconAnimated(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIconAnimated(true);
        });
      });
    }
  }, [state]);

  const doCopy = useCallback(
    async (format: BundleFormatType = "full") => {
      if (state === "loading") return;
      setState("loading");

      try {
        const plugin = findPlugin(window.location.href);
        if (!plugin?.fetchById) throw new Error("No plugin found for current page");

        const bundle = await plugin.fetchById(conversationId);
        const serialized = serializeConversation(bundle, { format });
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

  const isIdle = state === "idle";
  const isLoading = state === "loading";

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    padding: 0,
    border: "none",
    borderRadius: 6,
    background: hovered && isIdle ? 'rgba(128, 128, 128, 0.08)' : 'transparent',
    cursor: isLoading ? "wait" : "pointer",
    color: iconColor(state),
    opacity: isLoading ? 0.6 : (isIdle && !hovered ? 0.7 : 1),
    transform: pressed && (isIdle || isLoading)
      ? 'scale(0.9)'
      : (hovered && isIdle ? 'scale(1.06)' : 'scale(1)'),
    transition: pressed
      ? `transform ${MOTION.instant} ${MOTION.easeIn}, opacity ${MOTION.fast} ${MOTION.easeOut}, color ${MOTION.fast} ${MOTION.easeOut}, background ${MOTION.fast} ${MOTION.easeOut}`
      : `transform ${MOTION.fast} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}, color ${MOTION.fast} ${MOTION.easeOut}, background ${MOTION.fast} ${MOTION.easeOut}`,
    flexShrink: 0,
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        disabled={isLoading}
        title="Copy this conversation (CtxPort)"
        className="ctxport-list-copy-icon"
        style={buttonStyle}
      >
        <SmallIcon state={state} animated={iconAnimated} />
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
      return "#059669";
    case "error":
      return "#dc2626";
    default:
      return "currentColor";
  }
}

function SmallIcon({ state, animated }: { state: IconState; animated: boolean }) {
  if (state === "loading") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12" cy="12" r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    );
  }
  if (state === "success") {
    return (
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{
          transform: animated ? 'scale(1)' : 'scale(0.5)',
          opacity: animated ? 1 : 0,
          transition: animated
            ? `transform ${MOTION.normal} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}`
            : 'none',
        }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (state === "error") {
    return (
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{
          transform: animated ? 'scale(1)' : 'scale(0.5)',
          opacity: animated ? 1 : 0,
          transition: animated
            ? `transform ${MOTION.fast} ${MOTION.easeOut}, opacity ${MOTION.fast} ${MOTION.easeOut}`
            : 'none',
        }}
      >
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
