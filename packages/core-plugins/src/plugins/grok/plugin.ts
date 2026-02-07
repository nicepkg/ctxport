import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { InjectorCallbacks, Plugin, PluginContext, PluginInjector } from "../../types";
import { generateId } from "../../utils";
import type {
  GrokLoadedResponse,
  GrokLoadResponsesResponse,
  GrokResponseNodeResponse,
} from "./types";

const HOST_PATTERN = /^https:\/\/grok\.com\//i;
const CONVERSATION_PATTERN = /^https?:\/\/grok\.com\/c\/([a-zA-Z0-9-]+)/;
const API_BASE = "https://grok.com/rest/app-chat/conversations";

const CTXPORT_ATTR = "data-ctxport-injected";
const INJECTION_DELAY_MS = 2000;
const COPY_BTN_CLASS = "ctxport-grok-copy-btn";
const LIST_ICON_CLASS = "ctxport-grok-list-icon";
const FLOATING_BTN_ID = "ctxport-grok-floating-copy";

export const grokPlugin: Plugin = {
  id: "grok",
  version: "1.0.0",
  name: "Grok",

  urls: {
    hosts: ["https://grok.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId) {
      throw createAppError("E-PARSE-001", "Not a Grok conversation page");
    }

    const messages = await fetchConversation(conversationId);
    return buildBundle(messages, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const messages = await fetchConversation(conversationId);
    const url = `https://grok.com/c/${conversationId}`;
    return buildBundle(messages, url);
  },

  injector: createGrokInjector(),

  theme: {
    light: { primary: "#000000", secondary: "#eff3f4", fg: "#ffffff", secondaryFg: "#536471" },
    dark: { primary: "#ffffff", secondary: "#16181c", fg: "#000000", secondaryFg: "#71767b" },
  },
};

// --- Custom Grok injector (floating copy button + list icons) ---

function createGrokInjector(): PluginInjector {
  let observers: MutationObserver[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let callbacks: InjectorCallbacks | null = null;
  function tryInjectFloatingButton(): void {
    if (!callbacks) return;
    if (document.getElementById(FLOATING_BTN_ID)) return;

    const container = document.createElement("div");
    container.id = FLOATING_BTN_ID;
    container.className = COPY_BTN_CLASS;
    container.style.cssText = [
      "position: fixed",
      "bottom: 24px",
      "right: 24px",
      "z-index: 9999",
      "display: inline-flex",
      "align-items: center",
      "pointer-events: auto",
    ].join("; ");

    document.body.appendChild(container);
    callbacks.renderCopyButton(container);
  }

  function tryInjectListIcons(): void {
    if (!callbacks) return;

    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]');
    for (const link of links) {
      if (link.getAttribute(CTXPORT_ATTR) === "list-icon") continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = /\/c\/([a-zA-Z0-9-]+)/.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = document.createElement("div");
      container.id = `ctxport-list-icon-${id}`;
      container.className = LIST_ICON_CLASS;
      container.style.cssText = [
        "display: inline-flex",
        "align-items: center",
        "position: absolute",
        "right: 36px",
        "top: 50%",
        "opacity: 0",
        "transform: translateY(-50%) scale(0.85)",
        "transition: opacity 150ms cubic-bezier(0.55, 0, 1, 0.45), transform 150ms cubic-bezier(0.55, 0, 1, 0.45)",
        "pointer-events: none",
        "z-index: 10",
      ].join("; ");

      const parent = link.closest("li") ?? link;
      if (parent instanceof HTMLElement) {
        const computed = getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(container);
        parent.addEventListener("mouseenter", () => {
          container.style.opacity = "1";
          container.style.transform = "translateY(-50%) scale(1)";
          container.style.transition = "opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.22, 1.2, 0.36, 1)";
          container.style.pointerEvents = "auto";
        });
        parent.addEventListener("mouseleave", () => {
          container.style.opacity = "0";
          container.style.transform = "translateY(-50%) scale(0.85)";
          container.style.transition = "opacity 150ms cubic-bezier(0.55, 0, 1, 0.45), transform 150ms cubic-bezier(0.55, 0, 1, 0.45)";
          container.style.pointerEvents = "none";
        });
      }

      link.setAttribute(CTXPORT_ATTR, "list-icon");
      callbacks.renderListIcon(container, id);
    }
  }

  function debouncedCallback(fn: () => void): () => void {
    let rafId: number | null = null;
    let running = false;

    return () => {
      if (running || rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        running = true;
        try { fn(); } finally {
          Promise.resolve().then(() => { running = false; });
        }
      });
    };
  }

  return {
    inject(_ctx: PluginContext, cbs: InjectorCallbacks) {
      callbacks = cbs;

      // Floating copy button (fixed bottom-right)
      const copyTimer = setTimeout(() => {
        tryInjectFloatingButton();
      }, INJECTION_DELAY_MS);
      timers.push(copyTimer);

      // List icons
      const listTimer = setTimeout(() => {
        tryInjectListIcons();
        const debouncedTry = debouncedCallback(() => tryInjectListIcons());
        const sidebar = document.querySelector("nav") ?? document.body;
        const observer = new MutationObserver(debouncedTry);
        observer.observe(sidebar, { childList: true, subtree: true });
        observers.push(observer);
      }, INJECTION_DELAY_MS);
      timers.push(listTimer);
    },

    cleanup() {
      for (const obs of observers) obs.disconnect();
      observers = [];
      for (const timer of timers) clearTimeout(timer);
      timers = [];
      document.querySelectorAll(`.${COPY_BTN_CLASS}`).forEach((el) => el.remove());
      document.querySelectorAll(`.${LIST_ICON_CLASS}`).forEach((el) => el.remove());
      callbacks = null;
    },
  };
}

// --- Internal: URL parsing ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// --- Internal: API fetch ---

async function fetchConversation(conversationId: string): Promise<GrokLoadedResponse[]> {
  // Step 1: Get response node tree
  const nodeResponse = await fetch(
    `${API_BASE}/${conversationId}/response-node?includeThreads=true`,
    {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );

  if (!nodeResponse.ok) {
    throw createAppError("E-PARSE-005", `Grok API responded with ${nodeResponse.status}`);
  }

  const nodeData = (await nodeResponse.json()) as GrokResponseNodeResponse;
  const responseIds = nodeData.responseNodes.map((n) => n.responseId);

  if (responseIds.length === 0) {
    throw createAppError("E-PARSE-005", "No messages found in Grok conversation");
  }

  // Step 2: Load full message content
  const loadResponse = await fetch(
    `${API_BASE}/${conversationId}/load-responses`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ responseIds }),
    },
  );

  if (!loadResponse.ok) {
    throw createAppError("E-PARSE-005", `Grok API responded with ${loadResponse.status}`);
  }

  const loadData = (await loadResponse.json()) as GrokLoadResponsesResponse;
  return sortByTree(nodeData.responseNodes, loadData.responses);
}

// --- Internal: Sort messages by parent chain ---

function sortByTree(
  nodes: GrokResponseNodeResponse["responseNodes"],
  responses: GrokLoadedResponse[],
): GrokLoadedResponse[] {
  const responseMap = new Map(responses.map((r) => [r.responseId, r]));

  // Find root node (no parentResponseId)
  const root = nodes.find((n) => !n.parentResponseId);
  if (!root) return responses;

  // Build child lookup
  const childMap = new Map<string, string>();
  for (const node of nodes) {
    if (node.parentResponseId) {
      childMap.set(node.parentResponseId, node.responseId);
    }
  }

  // Walk the chain
  const sorted: GrokLoadedResponse[] = [];
  let currentId: string | undefined = root.responseId;

  while (currentId) {
    const response = responseMap.get(currentId);
    if (response) sorted.push(response);
    currentId = childMap.get(currentId);
  }

  return sorted;
}

// --- Internal: Build ContentBundle ---

function buildBundle(
  messages: GrokLoadedResponse[],
  url: string,
): ContentBundle {
  if (messages.length === 0) {
    throw createAppError("E-PARSE-005", "No messages found in Grok conversation");
  }

  // Use first user message as title
  const firstUserMsg = messages.find((m) => m.sender === "human");
  const title = firstUserMsg
    ? firstUserMsg.message.slice(0, 50) +
      (firstUserMsg.message.length > 50 ? "..." : "")
    : undefined;

  const nodes: ContentBundle["nodes"] = messages.map((msg, index) => ({
    id: generateId(),
    participantId: msg.sender === "human" ? "user" : "assistant",
    content: msg.message,
    order: index,
    type: "message",
    timestamp: msg.createTime,
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "Grok", role: "assistant" },
    ],
    nodes,
    source: {
      platform: "grok",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "grok",
      pluginVersion: "1.0.0",
    },
  };
}
