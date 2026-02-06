import "./styles/globals.css";

import { EXTENSION_CONTENT_MATCHES, registerBuiltinAdapters } from "@ctxport/core-adapters";
import { createRoot } from "react-dom/client";
import App from "~/components/app";
import {
  CTXPORT_COMPONENT_NAME,
  EXTENSION_RUNTIME_MESSAGE,
  EXTENSION_WINDOW_EVENT,
  type ExtensionRuntimeMessageType,
} from "~/constants/extension-runtime";

export default defineContentScript({
  matches: EXTENSION_CONTENT_MATCHES,
  cssInjectionMode: "ui",

  async main(ctx) {
    // Register manifest adapters early so App's first render has access
    registerBuiltinAdapters();

    const ui = await createShadowRootUi(ctx, {
      name: CTXPORT_COMPONENT_NAME,
      position: "overlay",
      anchor: "body",
      append: "first",
      zIndex: 99999,
      onMount(container) {
        const wrapper = document.createElement("div");
        wrapper.id = "ctxport-root";
        container.appendChild(wrapper);

        const themeTarget =
          container instanceof HTMLElement ? container : wrapper;

        // Dark mode detection and sync
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

        const updateTheme = () => {
          const isDark =
            document.documentElement.classList.contains("dark") ||
            document.body.classList.contains("dark") ||
            prefersDark.matches;
          themeTarget.classList.toggle("dark", isDark);
        };
        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class"],
        });
        prefersDark.addEventListener("change", updateTheme);

        // SPA URL change detection
        const notifyUrlChange = () => {
          updateTheme();
          window.dispatchEvent(
            new CustomEvent(EXTENSION_WINDOW_EVENT.URL_CHANGE, {
              detail: { url: window.location.href },
            }),
          );
        };

        const originalPushState = history.pushState.bind(history);
        const originalReplaceState = history.replaceState.bind(history);
        history.pushState = function (...args) {
          originalPushState.apply(this, args);
          notifyUrlChange();
        };
        history.replaceState = function (...args) {
          originalReplaceState.apply(this, args);
          notifyUrlChange();
        };
        window.addEventListener("popstate", notifyUrlChange);
        notifyUrlChange();

        // Mount React app
        const root = createRoot(wrapper);
        root.render(<App />);

        // Runtime message listener (from background/popup)
        const runtimeListener = (message: unknown, _sender: unknown) => {
          const messageType =
            typeof message === "object" && message !== null && "type" in message
              ? (message.type as ExtensionRuntimeMessageType)
              : null;

          if (!messageType) return undefined;

          if (messageType === EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT) {
            // Trigger copy on the injected copy button
            const btn = document.querySelector<HTMLButtonElement>(
              '[class^="ctxport-"][class$="-copy-btn"] button',
            );
            btn?.click();
            return undefined;
          }

          if (messageType === EXTENSION_RUNTIME_MESSAGE.TOGGLE_BATCH) {
            window.dispatchEvent(
              new Event(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH),
            );
            return undefined;
          }

          return undefined;
        };

        browser.runtime.onMessage.addListener(runtimeListener);

        // Stop event propagation from Shadow DOM to host
        const eventTarget =
          container instanceof EventTarget ? container : wrapper;
        const stopPropagation = (event: Event) => event.stopPropagation();
        const eventTypes = ["wheel", "touchstart", "touchmove", "touchend"];
        eventTypes.forEach((type) => {
          eventTarget.addEventListener(type, stopPropagation);
        });

        return {
          root,
          wrapper,
          cleanup: () => {
            eventTypes.forEach((type) => {
              eventTarget.removeEventListener(type, stopPropagation);
            });
            browser.runtime.onMessage.removeListener(runtimeListener);
            observer.disconnect();
            prefersDark.removeEventListener("change", updateTheme);
            window.removeEventListener("popstate", notifyUrlChange);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
          },
        };
      },
      onRemove(elements) {
        if (!elements) return;
        elements.cleanup();
        elements.root.unmount();
        elements.wrapper.remove();
      },
    });

    ui.mount();
  },
});
