import type { ContentBundle } from "@ctxport/core-schema";

/** Plugin runtime context */
export interface PluginContext {
  /** Current page URL */
  url: string;
  /** Current page Document object */
  document: Document;
}

/** UI injector callbacks — extension provides these, plugin's injector calls them */
export interface InjectorCallbacks {
  /** Render copy button into the given container */
  renderCopyButton: (container: HTMLElement) => void;
  /** Render list copy icon into the given container */
  renderListIcon: (container: HTMLElement, itemId: string) => void;
}

/** UI injector — plugin decides how to inject UI elements into the host page */
export interface PluginInjector {
  /** Inject UI elements into the host page */
  inject: (ctx: PluginContext, callbacks: InjectorCallbacks) => void;
  /** Clean up all injected UI elements and observers */
  cleanup: () => void;
}

/** Theme color tokens */
export interface ThemeConfig {
  light: {
    primary: string;
    secondary: string;
    fg: string;
    secondaryFg: string;
  };
  dark?: {
    primary: string;
    secondary: string;
    fg: string;
    secondaryFg: string;
  };
}

/** Plugin definition */
export interface Plugin {
  /** Unique identifier */
  readonly id: string;
  /** Version string */
  readonly version: string;
  /** Human-readable name */
  readonly name: string;

  /** URL matching rules */
  urls: {
    /** Chrome Extension match patterns (for manifest.json content_scripts.matches) */
    hosts: string[];
    /** Runtime URL matching — does this plugin handle the current page? */
    match: (url: string) => boolean;
  };

  /** From current page, extract content into a ContentBundle */
  extract: (ctx: PluginContext) => Promise<ContentBundle>;

  /** Fetch content by ID (sidebar list copy). Not all plugins need this. */
  fetchById?: (id: string) => Promise<ContentBundle>;

  /** UI injector — how to place copy buttons etc. on the page */
  injector?: PluginInjector;

  /** Theme colors (for UI elements) */
  theme?: ThemeConfig;
}
