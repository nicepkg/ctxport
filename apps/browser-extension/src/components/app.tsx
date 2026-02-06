import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useExtensionUrl } from "~/hooks/use-extension-url";
import { CopyButton } from "./copy-button";
import { ListCopyIcon } from "./list-copy-icon";
import { Toast, type ToastData } from "./toast";
import { BatchProvider } from "./batch-mode/batch-provider";
import { BatchBar } from "./batch-mode/batch-bar";
import { ManifestInjector } from "~/injectors/manifest-injector";
import type { PlatformInjector } from "~/injectors/base-injector";
import { INJECTION_DELAY_MS } from "~/injectors/base-injector";
import { EXTENSION_WINDOW_EVENT } from "~/constants/extension-runtime";
import {
  getRegisteredManifests,
  type ManifestEntry,
} from "@ctxport/core-adapters/manifest";

function detectManifest(url: string): ManifestEntry | undefined {
  return getRegisteredManifests().find((entry) =>
    entry.manifest.urls.hostPatterns.some((p) => p.test(url)),
  );
}

function isConversationPage(url: string): boolean {
  return getRegisteredManifests().some((entry) =>
    entry.manifest.urls.conversationUrlPatterns.some((p) => p.test(url)),
  );
}

export default function App() {
  const url = useExtensionUrl();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFloatingCopy, setShowFloatingCopy] = useState(false);
  const injectorRef = useRef<PlatformInjector | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const entry = detectManifest(url);
  const onConversationPage = isConversationPage(url);

  useEffect(() => {
    // Clean up previous injector
    injectorRef.current?.cleanup();
    injectorRef.current = null;
    setShowFloatingCopy(false);

    if (!entry) return;

    const injector = new ManifestInjector(entry.manifest);
    injectorRef.current = injector;

    // Inject copy button in conversation detail header
    injector.injectCopyButton((container) => {
      const root = createRoot(container);
      root.render(<CopyButton onToast={showToast} />);
    });

    // After injection delay + a buffer, check if the copy button was injected.
    // If not (e.g., header selectors didn't match), show floating fallback.
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (onConversationPage) {
      fallbackTimer = setTimeout(() => {
        const copyBtnClass = `ctxport-${entry.manifest.provider}-copy-btn`;
        const injected = document.querySelector(`.${copyBtnClass}`);
        if (!injected) {
          setShowFloatingCopy(true);
        }
      }, INJECTION_DELAY_MS + 500);
    }

    // Inject copy icons in sidebar list
    injector.injectListIcons((container, conversationId) => {
      const root = createRoot(container);
      root.render(
        <ListCopyIcon
          conversationId={conversationId}
          onToast={showToast}
        />,
      );
    });

    return () => {
      injector.cleanup();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [url, entry, onConversationPage, showToast]);

  // Listen for keyboard shortcuts via window events
  useEffect(() => {
    const handleCopyCurrent = () => {
      const btn = document.querySelector<HTMLButtonElement>(
        ".ctxport-copy-btn button",
      );
      btn?.click();
    };

    const handleToggleBatch = () => {
      window.dispatchEvent(new Event(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH));
    };

    window.addEventListener(
      EXTENSION_WINDOW_EVENT.COPY_SUCCESS,
      handleCopyCurrent,
    );
    window.addEventListener(
      EXTENSION_WINDOW_EVENT.TOGGLE_BATCH,
      handleToggleBatch,
    );

    return () => {
      window.removeEventListener(
        EXTENSION_WINDOW_EVENT.COPY_SUCCESS,
        handleCopyCurrent,
      );
      window.removeEventListener(
        EXTENSION_WINDOW_EVENT.TOGGLE_BATCH,
        handleToggleBatch,
      );
    };
  }, []);

  return (
    <BatchProvider>
      <Toast data={toast} onDismiss={dismissToast} />
      <BatchBar onToast={showToast} />
      {showFloatingCopy && onConversationPage && (
        <FloatingCopyButton onToast={showToast} />
      )}
    </BatchProvider>
  );
}

/** Floating copy button rendered inside Shadow DOM overlay as fallback */
function FloatingCopyButton({
  onToast,
}: {
  onToast: (message: string, type: "success" | "error") => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-primary, #1a1a2e)",
        borderRadius: 12,
        padding: "8px 12px",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary, #a0a0b0)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          userSelect: "none",
        }}
      >
        CtxPort
      </span>
      <CopyButton onToast={onToast} />
    </div>
  );
}
