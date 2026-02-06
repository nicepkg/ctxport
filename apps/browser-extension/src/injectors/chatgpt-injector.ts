import {
  type PlatformInjector,
  markInjected,
  isInjected,
  createContainer,
  removeAllByClass,
  debouncedObserverCallback,
  INJECTION_DELAY_MS,
} from "./base-injector";

const COPY_BTN_CLASS = "ctxport-chatgpt-copy-btn";
const LIST_ICON_CLASS = "ctxport-chatgpt-list-icon";
const BATCH_CB_CLASS = "ctxport-chatgpt-batch-cb";

export class ChatGPTInjector implements PlatformInjector {
  readonly platform = "chatgpt" as const;
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

    // Delay initial injection to let host React finish hydration
    const timer = setTimeout(() => {
      this.tryInjectCopyButton();

      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectCopyButton(),
      );
      // Observe only the main content area, not the entire body
      const target = document.querySelector("main") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(target, { childList: true, subtree: true });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectCopyButton(): void {
    if (!this.renderButton) return;

    // ChatGPT title bar action buttons area
    const selectors = [
      "main .sticky .flex.items-center.gap-2",
      'main header [class*="flex"][class*="items-center"]',
      'div[data-testid="conversation-header"] .flex.items-center',
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
      // Observe only the sidebar nav, not the entire body
      const sidebar = document.querySelector("nav") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(sidebar, { childList: true, subtree: true });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectListIcons(): void {
    if (!this.renderIcon) return;

    // ChatGPT sidebar conversation list items have <a> tags with href="/c/{id}"
    const links = document.querySelectorAll<HTMLAnchorElement>(
      'nav a[href^="/c/"], nav a[href^="/g/"]',
    );

    for (const link of links) {
      if (isInjected(link, "list-icon")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const id = href.split("/").pop();
      if (!id) continue;

      const container = createContainer(`ctxport-list-icon-${id}`);
      container.className = LIST_ICON_CLASS;
      container.style.position = "absolute";
      container.style.right = "36px";
      container.style.top = "50%";
      container.style.transform = "translateY(-50%)";
      container.style.opacity = "0";
      container.style.transition = "opacity 150ms ease";
      container.style.zIndex = "10";

      // Make the parent relatively positioned if not already
      const parent = link.closest("li") ?? link;
      if (parent instanceof HTMLElement) {
        const computed = getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(container);

        // Show on hover
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
    const sidebar = document.querySelector("nav") ?? document.body;
    const observer = new MutationObserver(debouncedTry);
    observer.observe(sidebar, { childList: true, subtree: true });
    this.observers.push(observer);
  }

  private tryInjectBatchCheckboxes(): void {
    if (!this.renderCheckbox) return;

    const links = document.querySelectorAll<HTMLAnchorElement>(
      'nav a[href^="/c/"], nav a[href^="/g/"]',
    );

    for (const link of links) {
      if (isInjected(link, "batch-cb")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const id = href.split("/").pop();
      if (!id) continue;

      const container = createContainer(`ctxport-batch-cb-${id}`);
      container.className = BATCH_CB_CLASS;
      container.style.marginRight = "4px";
      container.style.flexShrink = "0";

      // Prepend before the text
      link.insertBefore(container, link.firstChild);
      markInjected(link, "batch-cb");
      this.renderCheckbox(container, id);
    }
  }

  removeBatchCheckboxes(): void {
    removeAllByClass(BATCH_CB_CLASS);
    // Reset injected markers for batch
    const links = document.querySelectorAll<HTMLAnchorElement>(
      'nav a[href^="/c/"], nav a[href^="/g/"]',
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
