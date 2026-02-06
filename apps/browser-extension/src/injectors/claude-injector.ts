import {
  type PlatformInjector,
  markInjected,
  isInjected,
  createContainer,
  removeAllByClass,
  debouncedObserverCallback,
  INJECTION_DELAY_MS,
} from "./base-injector";

const COPY_BTN_CLASS = "ctxport-claude-copy-btn";
const LIST_ICON_CLASS = "ctxport-claude-list-icon";
const BATCH_CB_CLASS = "ctxport-claude-batch-cb";

export class ClaudeInjector implements PlatformInjector {
  readonly platform = "claude" as const;
  private observers: MutationObserver[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private renderButton: ((container: HTMLElement) => void) | null = null;
  private renderIcon:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;
  private renderCheckbox:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;

  injectCopyButton(renderButton: (container: HTMLElement) => void): void {
    this.renderButton = renderButton;

    const timer = setTimeout(() => {
      this.tryInjectCopyButton();

      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectCopyButton(),
      );
      // Observe only the main content area
      const target =
        document.querySelector("main") ??
        document.querySelector('[class*="conversation"]') ??
        document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(target, { childList: true, subtree: true });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectCopyButton(): void {
    if (!this.renderButton) return;

    // Claude's conversation header area
    const selectors = [
      "header .flex.items-center.gap-1",
      "header .flex.items-center.gap-2",
      '[class*="sticky"] .flex.items-center',
      'div[class*="conversation"] header .flex',
    ];

    for (const selector of selectors) {
      const target = document.querySelector<HTMLElement>(selector);
      if (target && !isInjected(target, "copy-btn")) {
        const container = createContainer(`ctxport-copy-btn-${Date.now()}`);
        container.className = COPY_BTN_CLASS;
        target.insertBefore(container, target.firstChild);
        markInjected(target, "copy-btn");
        this.renderButton(container);
        return;
      }
    }
  }

  injectListIcons(
    renderIcon: (container: HTMLElement, conversationId: string) => void,
  ): void {
    this.renderIcon = renderIcon;

    const timer = setTimeout(() => {
      this.tryInjectListIcons();

      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectListIcons(),
      );
      const sidebar =
        document.querySelector('[class*="sidebar"]') ??
        document.querySelector("nav") ??
        document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(sidebar, { childList: true, subtree: true });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectListIcons(): void {
    if (!this.renderIcon) return;

    // Claude sidebar: links with href="/chat/{uuid}"
    const links = document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/chat/"]',
    );

    for (const link of links) {
      if (isInjected(link, "list-icon")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const id = href.replace("/chat/", "");
      if (!id || id.includes("/")) continue;

      const container = createContainer(`ctxport-list-icon-${id}`);
      container.className = LIST_ICON_CLASS;
      container.style.position = "absolute";
      container.style.right = "36px";
      container.style.top = "50%";
      container.style.transform = "translateY(-50%)";
      container.style.opacity = "0";
      container.style.transition = "opacity 150ms ease";
      container.style.zIndex = "10";

      const parent = link.closest("li") ?? link.closest("div") ?? link;
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
      this.renderIcon(container, id);
    }
  }

  injectBatchCheckboxes(
    renderCheckbox: (container: HTMLElement, conversationId: string) => void,
  ): void {
    this.renderCheckbox = renderCheckbox;
    this.tryInjectBatchCheckboxes();

    const debouncedTry = debouncedObserverCallback(() =>
      this.tryInjectBatchCheckboxes(),
    );
    const sidebar =
      document.querySelector('[class*="sidebar"]') ??
      document.querySelector("nav") ??
      document.body;
    const observer = new MutationObserver(debouncedTry);
    observer.observe(sidebar, { childList: true, subtree: true });
    this.observers.push(observer);
  }

  private tryInjectBatchCheckboxes(): void {
    if (!this.renderCheckbox) return;

    const links = document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/chat/"]',
    );

    for (const link of links) {
      if (isInjected(link, "batch-cb")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const id = href.replace("/chat/", "");
      if (!id || id.includes("/")) continue;

      const container = createContainer(`ctxport-batch-cb-${id}`);
      container.className = BATCH_CB_CLASS;
      container.style.marginRight = "4px";
      container.style.flexShrink = "0";

      link.insertBefore(container, link.firstChild);
      markInjected(link, "batch-cb");
      this.renderCheckbox(container, id);
    }
  }

  removeBatchCheckboxes(): void {
    removeAllByClass(BATCH_CB_CLASS);
    const links = document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="/chat/"]',
    );
    for (const link of links) {
      if (link.getAttribute("data-ctxport-injected") === "batch-cb") {
        link.removeAttribute("data-ctxport-injected");
      }
    }
  }

  cleanup(): void {
    for (const obs of this.observers) obs.disconnect();
    this.observers = [];
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    removeAllByClass(COPY_BTN_CLASS);
    removeAllByClass(LIST_ICON_CLASS);
    removeAllByClass(BATCH_CB_CLASS);
    this.renderButton = null;
    this.renderIcon = null;
    this.renderCheckbox = null;
  }
}
