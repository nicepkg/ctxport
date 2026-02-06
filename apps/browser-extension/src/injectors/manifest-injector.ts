import type { AdapterManifest } from "@ctxport/core-adapters/manifest";
import {
  type PlatformInjector,
  markInjected,
  isInjected,
  createContainer,
  removeAllByClass,
  debouncedObserverCallback,
  INJECTION_DELAY_MS,
} from "./base-injector";

/**
 * 通用 injector：从 manifest.injection 配置驱动 DOM 注入。
 * 替代平台特定的 injector 实现。
 */
export class ManifestInjector implements PlatformInjector {
  readonly platform: string;
  private observers: MutationObserver[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private renderButton: ((container: HTMLElement) => void) | null = null;
  private renderIcon:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;
  private renderCheckbox:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;

  private readonly copyBtnClass: string;
  private readonly listIconClass: string;
  private readonly batchCbClass: string;

  constructor(private readonly manifest: AdapterManifest) {
    this.platform = manifest.provider;
    this.copyBtnClass = `ctxport-${manifest.provider}-copy-btn`;
    this.listIconClass = `ctxport-${manifest.provider}-list-icon`;
    this.batchCbClass = `ctxport-${manifest.provider}-batch-cb`;
  }

  injectCopyButton(renderButton: (container: HTMLElement) => void): void {
    this.renderButton = renderButton;

    const timer = setTimeout(() => {
      this.tryInjectCopyButton();
      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectCopyButton(),
      );
      const targetSel = this.manifest.injection.mainContentSelector;
      const target = targetSel
        ? document.querySelector(targetSel)
        : document.querySelector("main") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(target ?? document.body, {
        childList: true,
        subtree: true,
      });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectCopyButton(): void {
    if (!this.renderButton) return;

    const { selectors, position } = this.manifest.injection.copyButton;
    for (const selector of selectors) {
      const target = document.querySelector<HTMLElement>(selector);
      if (target && !isInjected(target, "copy-btn")) {
        const container = createContainer(`ctxport-copy-btn-${Date.now()}`);
        container.className = this.copyBtnClass;

        switch (position) {
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
            target.parentElement?.insertBefore(
              container,
              target.nextSibling,
            );
            break;
        }

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
      const sidebarSel = this.manifest.injection.sidebarSelector;
      const sidebar = sidebarSel
        ? document.querySelector(sidebarSel)
        : document.querySelector("nav") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(sidebar ?? document.body, {
        childList: true,
        subtree: true,
      });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectListIcons(): void {
    if (!this.renderIcon) return;

    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "list-icon")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = listItem.idPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-list-icon-${id}`);
      container.className = this.listIconClass;
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
    const sidebarSel = this.manifest.injection.sidebarSelector;
    const sidebar = sidebarSel
      ? document.querySelector(sidebarSel)
      : document.querySelector("nav") ?? document.body;
    const observer = new MutationObserver(debouncedTry);
    observer.observe(sidebar ?? document.body, {
      childList: true,
      subtree: true,
    });
    this.observers.push(observer);
  }

  private tryInjectBatchCheckboxes(): void {
    if (!this.renderCheckbox) return;

    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "batch-cb")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = listItem.idPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-batch-cb-${id}`);
      container.className = this.batchCbClass;
      container.style.marginRight = "4px";
      container.style.flexShrink = "0";

      link.insertBefore(container, link.firstChild);
      markInjected(link, "batch-cb");
      this.renderCheckbox(container, id);
    }
  }

  removeBatchCheckboxes(): void {
    removeAllByClass(this.batchCbClass);
    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
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
    removeAllByClass(this.copyBtnClass);
    removeAllByClass(this.listIconClass);
    removeAllByClass(this.batchCbClass);
    this.renderButton = null;
    this.renderIcon = null;
    this.renderCheckbox = null;
  }
}
