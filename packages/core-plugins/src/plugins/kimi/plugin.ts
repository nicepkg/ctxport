import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import type { KimiMessage, KimiMessagesResponse } from "./types";

const HOST_PATTERN = /^https:\/\/(?:www\.)?kimi\.(?:ai|com)\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/(?:www\.)?kimi\.(?:ai|com)\/chat\/([a-zA-Z0-9-]+)/i;
const API_PATH = "/apiv2/kimi.gateway.chat.v1.ChatService/ListMessages";

export const kimiPlugin: Plugin = {
  id: "kimi",
  version: "1.0.0",
  name: "Kimi",

  urls: {
    hosts: [
      "https://kimi.ai/*",
      "https://www.kimi.ai/*",
      "https://kimi.com/*",
      "https://www.kimi.com/*",
    ],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId) {
      throw createAppError("E-PARSE-001", "Not a Kimi conversation page");
    }

    const data = await fetchMessages(ctx.url, conversationId);
    return parseConversation(data, ctx.url, ctx.document.title);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const data = await fetchMessages(window.location.origin, conversationId);
    const url = `${window.location.origin}/chat/${conversationId}`;
    return parseConversation(data, url, document.title);
  },

  injector: createChatInjector({
    platform: "kimi",
    copyButtonSelectors: ["main header", 'main [class*="chat-input"]'],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'a[href*="/chat/"]',
    listItemIdPattern: /\/chat\/([a-zA-Z0-9-]+)(?:[/?#]|$)/,
    mainContentSelector: "main",
    sidebarSelector: "nav",
  }),

  theme: {
    light: {
      primary: "#536dfe",
      secondary: "#eef0ff",
      fg: "#ffffff",
      secondaryFg: "#3949ab",
    },
    dark: {
      primary: "#8795ff",
      secondary: "#252a48",
      fg: "#11152b",
      secondaryFg: "#c5cbff",
    },
  },
};

function extractConversationId(url: string): string | null {
  return CONVERSATION_PATTERN.exec(url)?.[1] ?? null;
}

async function fetchMessages(
  pageUrl: string,
  conversationId: string,
): Promise<KimiMessagesResponse> {
  const origin = new URL(pageUrl).origin;
  const accessToken = getAccessToken();
  const response = await fetch(`${origin}${API_PATH}`, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "connect-protocol-version": "1",
      "x-msh-platform": "web",
      "x-msh-version": "1.0.0",
      "x-language": "en-US",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ chatId: conversationId }),
  });

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `Kimi API responded with ${response.status}`,
    );
  }

  return (await response.json()) as KimiMessagesResponse;
}

function getAccessToken(): string | null {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

function getMessages(data: KimiMessagesResponse): KimiMessage[] {
  const messages = data.messages ?? data.data?.messages ?? [];
  return Array.isArray(messages) ? messages : [];
}

function orderMessages(messages: KimiMessage[]): KimiMessage[] {
  const messagesById = new Map(
    messages.filter((message) => message.id).map((message) => [message.id!, message]),
  );
  const root = messages.find(
    (message) =>
      message.role === "system" ||
      message.parentId === "00000000-0000-0000-0000-000000000000",
  );
  if (!root?.id) return [...messages].reverse();

  const ordered: KimiMessage[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    const message = messagesById.get(id);
    if (!message || visited.has(id)) return;
    visited.add(id);
    if (message.role !== "system") ordered.push(message);
    for (const childId of message.childrenMessageIds ?? []) visit(childId);
  };

  visit(root.id);
  return ordered.length ? ordered : [...messages].reverse();
}

function getMessageText(message: KimiMessage): string {
  return (message.blocks ?? [])
    .map((block) => block.text?.content?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

function parseConversation(
  data: KimiMessagesResponse,
  url: string,
  pageTitle: string,
): ContentBundle {
  const messages = orderMessages(getMessages(data));
  const contentNodes: ContentBundle["nodes"] = [];

  for (const message of messages) {
    const text = getMessageText(message);
    if (!text) continue;
    const role = message.role?.toLowerCase();
    if (role !== "user" && role !== "assistant") continue;

    contentNodes.push({
      id: generateId(),
      participantId: role,
      content: text,
      order: contentNodes.length,
      type: "message",
      timestamp: message.createTime,
    });
  }

  if (contentNodes.length === 0) {
    throw createAppError("E-PARSE-005", "No messages found in Kimi conversation");
  }

  return {
    id: generateId(),
    title: pageTitle.replace(/\s*[-|]\s*Kimi.*$/i, "").trim() || undefined,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "Kimi", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "kimi",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "kimi",
      pluginVersion: "1.0.0",
    },
  };
}
