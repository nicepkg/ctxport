export interface PlatformInjector {
  readonly platform: "chatgpt" | "claude";

  /** Inject copy button in conversation detail header */
  injectCopyButton(renderButton: (container: HTMLElement) => void): void;

  /** Inject copy icons in sidebar list items */
  injectListIcons(
    renderIcon: (container: HTMLElement, conversationId: string) => void,
  ): void;

  /** Inject batch checkboxes in sidebar list items */
  injectBatchCheckboxes(
    renderCheckbox: (container: HTMLElement, conversationId: string) => void,
  ): void;

  /** Remove batch checkboxes */
  removeBatchCheckboxes(): void;

  /** Clean up all injections and observers */
  cleanup(): void;
}

const CTXPORT_ATTR = "data-ctxport-injected";

export function markInjected(el: HTMLElement, type: string): void {
  el.setAttribute(CTXPORT_ATTR, type);
}

export function isInjected(el: HTMLElement, type: string): boolean {
  return el.getAttribute(CTXPORT_ATTR) === type;
}

export function createContainer(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  return el;
}

export function removeAllByClass(className: string): void {
  document.querySelectorAll(`.${className}`).forEach((el) => el.remove());
}

/**
 * Create a debounced MutationObserver callback.
 * Uses requestAnimationFrame to batch rapid DOM mutations into a single callback,
 * preventing interference with the host page's React hydration/reconciliation.
 */
export function debouncedObserverCallback(fn: () => void): () => void {
  let rafId: number | null = null;
  let isInjecting = false;

  return () => {
    // Skip if we're currently injecting (prevents re-entrant mutations)
    if (isInjecting) return;
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      isInjecting = true;
      try {
        fn();
      } finally {
        // Release the guard after a microtask to let React finish processing
        Promise.resolve().then(() => {
          isInjecting = false;
        });
      }
    });
  };
}

/**
 * Initial injection delay in ms.
 * Waits for the host page's React to finish hydration before injecting.
 */
export const INJECTION_DELAY_MS = 2000;
