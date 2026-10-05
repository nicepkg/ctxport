import type {
  PluginContext,
  PluginInjector,
  InjectorCallbacks,
} from "../../types";

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
 * Create a PluginInjector for AI chat platforms.
 * Handles copy button and list icons via MutationObserver.
 */
export function createChatInjector(config: ChatInjectorConfig): PluginInjector {
  const copyBtnClass = `ctxport-${config.platform}-copy-btn`;
  const listIconClass = `ctxport-${config.platform}-list-icon`;

  let observers: MutationObserver[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let callbacks: InjectorCallbacks | null = null;
  const injectedTargets = new Set<HTMLElement>();

  function markTargetInjected(el: HTMLElement, type: string): void {
    markInjected(el, type);
    injectedTargets.add(el);
  }

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

        markTargetInjected(target, "copy-btn");
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
      container.style.opacity = "1";
      container.style.transform = "translateY(-50%)";
      container.style.pointerEvents = "auto";
      container.style.zIndex = "10";

      const parent = link.closest("li") ?? link;
      if (parent instanceof HTMLElement) {
        const computed = getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(container);
      }

      markTargetInjected(link, "list-icon");
      callbacks.renderListIcon(container, id);
    }
  }

  return {
    inject(_ctx: PluginContext, cbs: InjectorCallbacks) {
      callbacks = cbs;

      // Copy button with MutationObserver on main content area
      const copyTimer = setTimeout(() => {
        tryInjectCopyButton();
        const debouncedTry = debouncedObserverCallback(() =>
          tryInjectCopyButton(),
        );
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
        const debouncedTry = debouncedObserverCallback(() =>
          tryInjectListIcons(),
        );
        const observer = new MutationObserver(debouncedTry);
        observer.observe(document.body, { childList: true, subtree: true });
        observers.push(observer);
      }, INJECTION_DELAY_MS);
      timers.push(listTimer);
    },

    cleanup() {
      for (const obs of observers) obs.disconnect();
      observers = [];
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      removeAllByClass(copyBtnClass);
      removeAllByClass(listIconClass);
      for (const target of injectedTargets) {
        target.removeAttribute(CTXPORT_ATTR);
      }
      injectedTargets.clear();
      callbacks = null;
    },
  };
}
