import type { PluginContext, PluginInjector, InjectorCallbacks } from "../../types";

/** Configuration for the shared chat injector factory */
export interface ChatInjectorConfig {
  platform: string;
  copyButtonSelectors: string[];
  copyButtonPosition: "prepend" | "append" | "before" | "after";
  listItemLinkSelector: string;
  listItemIdPattern: RegExp;
  mainContentSelector: string;
  sidebarSelector: string;
}

const CTXPORT_ATTR = "data-ctxport-injected";
const INJECTION_DELAY_MS = 2000;

function markInjected(el: HTMLElement, type: string): void {
  el.setAttribute(CTXPORT_ATTR, type);
}

function isInjected(el: HTMLElement, type: string): boolean {
  return el.getAttribute(CTXPORT_ATTR) === type;
}

function createContainer(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  return el;
}

function removeAllByClass(className: string): void {
  document.querySelectorAll(`.${className}`).forEach((el) => el.remove());
}

function debouncedObserverCallback(fn: () => void): () => void {
  let rafId: number | null = null;
  let isInjecting = false;

  return () => {
    if (isInjecting) return;
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      isInjecting = true;
      try {
        fn();
      } finally {
        Promise.resolve().then(() => {
          isInjecting = false;
        });
      }
    });
  };
}

/**
 * Create a PluginInjector for AI chat platforms (ChatGPT, Claude).
 * Handles copy button, list icons, and batch checkboxes via MutationObserver.
 */
export function createChatInjector(config: ChatInjectorConfig): PluginInjector {
  const copyBtnClass = `ctxport-${config.platform}-copy-btn`;
  const listIconClass = `ctxport-${config.platform}-list-icon`;
  const batchCbClass = `ctxport-${config.platform}-batch-cb`;

  let observers: MutationObserver[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let callbacks: InjectorCallbacks | null = null;

  function tryInjectCopyButton(): void {
    if (!callbacks) return;

    for (const selector of config.copyButtonSelectors) {
      const target = document.querySelector<HTMLElement>(selector);
      if (target && !isInjected(target, "copy-btn")) {
        const container = createContainer(`ctxport-copy-btn-${Date.now()}`);
        container.className = copyBtnClass;

        switch (config.copyButtonPosition) {
          case "prepend":
            target.insertBefore(container, target.firstChild);
            break;
          case "append":
            target.appendChild(container);
            break;
          case "before":
            target.parentElement?.insertBefore(container, target);
            break;
          case "after":
            target.parentElement?.insertBefore(container, target.nextSibling);
            break;
        }

        markInjected(target, "copy-btn");
        callbacks.renderCopyButton(container);
        return;
      }
    }
  }

  function tryInjectListIcons(): void {
    if (!callbacks) return;

    const links = document.querySelectorAll<HTMLAnchorElement>(
      config.listItemLinkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "list-icon")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = config.listItemIdPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-list-icon-${id}`);
      container.className = listIconClass;
      container.style.position = "absolute";
      container.style.right = "36px";
      container.style.top = "50%";
      container.style.transform = "translateY(-50%)";
      container.style.opacity = "0";
      container.style.transition = "opacity 150ms ease";
      container.style.zIndex = "10";

      const parent = link.closest("li") ?? link;
      if (parent instanceof HTMLElement) {
        const computed = getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(container);
        parent.addEventListener("mouseenter", () => {
          container.style.opacity = "1";
        });
        parent.addEventListener("mouseleave", () => {
          container.style.opacity = "0";
        });
      }

      markInjected(link, "list-icon");
      callbacks.renderListIcon(container, id);
    }
  }

  function tryInjectBatchCheckboxes(): void {
    if (!callbacks) return;

    const links = document.querySelectorAll<HTMLAnchorElement>(
      config.listItemLinkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "batch-cb")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = config.listItemIdPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-batch-cb-${id}`);
      container.className = batchCbClass;
      container.style.marginRight = "4px";
      container.style.flexShrink = "0";

      link.insertBefore(container, link.firstChild);
      markInjected(link, "batch-cb");
      callbacks.renderBatchCheckbox(container, id);
    }
  }

  return {
    inject(_ctx: PluginContext, cbs: InjectorCallbacks) {
      callbacks = cbs;

      // Copy button with MutationObserver on main content area
      const copyTimer = setTimeout(() => {
        tryInjectCopyButton();
        const debouncedTry = debouncedObserverCallback(() => tryInjectCopyButton());
        const target =
          document.querySelector(config.mainContentSelector) ??
          document.querySelector("main") ??
          document.body;
        const observer = new MutationObserver(debouncedTry);
        observer.observe(target, { childList: true, subtree: true });
        observers.push(observer);
      }, INJECTION_DELAY_MS);
      timers.push(copyTimer);

      // List icons with MutationObserver on sidebar
      const listTimer = setTimeout(() => {
        tryInjectListIcons();
        const debouncedTry = debouncedObserverCallback(() => tryInjectListIcons());
        const sidebar =
          document.querySelector(config.sidebarSelector) ??
          document.querySelector("nav") ??
          document.body;
        const observer = new MutationObserver(debouncedTry);
        observer.observe(sidebar, { childList: true, subtree: true });
        observers.push(observer);
      }, INJECTION_DELAY_MS);
      timers.push(listTimer);

      // Batch checkboxes (observed on sidebar too, activated via callback)
      // Note: batch checkboxes are injected on demand via renderBatchCheckbox callback
      // The sidebar observer above handles re-injection on DOM changes
    },

    cleanup() {
      for (const obs of observers) obs.disconnect();
      observers = [];
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      removeAllByClass(copyBtnClass);
      removeAllByClass(listIconClass);
      removeAllByClass(batchCbClass);
      callbacks = null;
    },
  };
}
