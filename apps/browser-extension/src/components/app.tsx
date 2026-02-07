import { findPlugin } from "@ctxport/core-plugins";
import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { CopyButton } from "./copy-button";
import { ListCopyIcon } from "./list-copy-icon";
import { Toast, type ToastData } from "./toast";
import { useExtensionUrl } from "~/hooks/use-extension-url";

export default function App() {
  const url = useExtensionUrl();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFloatingCopy, setShowFloatingCopy] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const showToast = useCallback(
    (data: {
      title: string;
      subtitle?: string;
      type: "success" | "error";
      isLarge?: boolean;
    }) => {
      setToast({ ...data });
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

  // COPY_CURRENT is handled directly by CopyButton via window event listener

  return (
    <>
      <Toast data={toast} onDismiss={dismissToast} />
      {showFloatingCopy && plugin && <FloatingCopyButton onToast={showToast} />}
    </>
  );
}

const FLOATING_MOTION = {
  normal: "250ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  springSubtle: "cubic-bezier(0.22, 1.2, 0.36, 1)",
} as const;

/** Floating copy button rendered inside Shadow DOM overlay as fallback */
function FloatingCopyButton({
  onToast,
}: {
  onToast: (data: {
    title: string;
    subtitle?: string;
    type: "success" | "error";
    isLarge?: boolean;
  }) => void;
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
        borderRadius: 12,
        padding: "2px",
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
      <CopyButton onToast={onToast} />
    </div>
  );
}
