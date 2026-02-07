import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useExtensionUrl } from "~/hooks/use-extension-url";
import { CopyButton } from "./copy-button";
import { ListCopyIcon } from "./list-copy-icon";
import { Toast, type ToastData } from "./toast";
import { BatchProvider } from "./batch-mode/batch-provider";
import { BatchBar } from "./batch-mode/batch-bar";
import { EXTENSION_WINDOW_EVENT } from "~/constants/extension-runtime";
import { findPlugin, type Plugin } from "@ctxport/core-plugins";

export default function App() {
  const url = useExtensionUrl();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFloatingCopy, setShowFloatingCopy] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const plugin = findPlugin(url);

  useEffect(() => {
    // Clean up previous injector
    cleanupRef.current?.();
    cleanupRef.current = null;
    setShowFloatingCopy(false);

    if (!plugin) return;

    if (plugin.injector) {
      plugin.injector.inject(
        { url, document },
        {
          renderCopyButton: (container) => {
            const root = createRoot(container);
            root.render(<CopyButton onToast={showToast} />);
          },
          renderListIcon: (container, itemId) => {
            const root = createRoot(container);
            root.render(
              <ListCopyIcon conversationId={itemId} onToast={showToast} />,
            );
          },
          renderBatchCheckbox: (_container, _itemId) => {
            // Batch checkboxes are handled by BatchProvider
          },
          removeBatchCheckboxes: () => {
            // Handled by injector cleanup
          },
        },
      );

      cleanupRef.current = () => plugin.injector?.cleanup();
    } else {
      // No injector — show floating copy button as fallback
      setShowFloatingCopy(true);
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [url, plugin, showToast]);

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
      {showFloatingCopy && plugin && (
        <FloatingCopyButton onToast={showToast} />
      )}
    </BatchProvider>
  );
}

const FLOATING_MOTION = {
  normal: '250ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  springSubtle: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
} as const;

/** Floating copy button rendered inside Shadow DOM overlay as fallback */
function FloatingCopyButton({
  onToast,
}: {
  onToast: (message: string, type: "success" | "error") => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 14,
        padding: "6px 6px 6px 14px",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        boxShadow: hovered
          ? "0 6px 24px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)"
          : "0 4px 20px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: `transform ${FLOATING_MOTION.normal} ${FLOATING_MOTION.springSubtle}, box-shadow ${FLOATING_MOTION.normal} ${FLOATING_MOTION.easeOut}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          letterSpacing: "0.02em",
          color: "rgba(0, 0, 0, 0.45)",
          userSelect: "none",
          textTransform: "uppercase",
        }}
      >
        CTXPORT
      </span>
      <CopyButton onToast={onToast} />
    </div>
  );
}
