import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import { extractClaudeMessageText } from "./message-converter";
import type { ClaudeConversationResponse, ClaudeMessage } from "./types";

const HOST_PATTERN = /^https:\/\/claude\.ai\//i;
const CONVERSATION_PATTERN = /^https?:\/\/claude\.ai\/chat\/([a-zA-Z0-9-]+)/;
const API_BASE = "https://claude.ai/api/organizations";

export const claudePlugin: Plugin = {
  id: "claude",
  version: "1.0.0",
  name: "Claude",

  urls: {
    hosts: ["https://claude.ai/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId)
      throw createAppError("E-PARSE-001", "Not a Claude conversation page");

    const orgId = extractOrgId(ctx.document.cookie);
    if (!orgId)
      throw createAppError("E-PARSE-005", "Cannot find Claude organization ID");

    const data = await fetchConversation(orgId, conversationId);
    return parseConversation(data, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const orgId = extractOrgId(document.cookie);
    if (!orgId)
      throw createAppError("E-PARSE-005", "Cannot find Claude organization ID");

    const data = await fetchConversation(orgId, conversationId);
    const url = `https://claude.ai/chat/${conversationId}`;
    return parseConversation(data, url);
  },

  injector: createChatInjector({
    platform: "claude",
    copyButtonSelectors: [
      'div:has(> div > button[data-testid="model-selector-dropdown"])',
    ],
    copyButtonPosition: "after",
    listItemLinkSelector: 'a[href^="/chat/"]',
    listItemIdPattern: /\/chat\/([a-zA-Z0-9-]+)$/,
    mainContentSelector: 'main, [class*="conversation"]',
    sidebarSelector: '[class*="sidebar"], nav',
  }),

  theme: {
    light: {
      primary: "#c6613f",
      secondary: "#ffedd5",
      fg: "#ffffff",
      secondaryFg: "#9a3412",
    },
    dark: {
      primary: "#c6613f",
      secondary: "#7c2d12",
      fg: "#431407",
      secondaryFg: "#ffedd5",
    },
  },
};

// --- Internal: URL parsing ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// --- Internal: Auth ---

function extractOrgId(cookie: string): string | null {
  const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]);
}

// --- Internal: API fetch ---

async function fetchConversation(
  orgId: string,
  conversationId: string,
): Promise<ClaudeConversationResponse> {
  const response = await fetch(
    `${API_BASE}/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      referrer: `https://claude.ai/chat/${conversationId}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      mode: "cors",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `Claude API responded with ${response.status}`,
    );
  }

  return (await response.json()) as ClaudeConversationResponse;
}

// --- Internal: Parse conversation into ContentBundle ---

function getSortValue(message: ClaudeMessage): number {
  if (message.created_at) {
    const parsed = Date.parse(message.created_at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return (message.index ?? 0) * 1000;
}

function parseConversation(
  data: ClaudeConversationResponse,
  url: string,
): ContentBundle {
  const messages = data.chat_messages ?? [];
  const sorted = [...messages].sort(
    (a, b) => getSortValue(a) - getSortValue(b),
  );

  // Extract text and merge consecutive same-role messages
  interface GroupedMessage {
    sender: "human" | "assistant";
    text: string;
  }

  const grouped: GroupedMessage[] = [];
  for (const message of sorted) {
    const text = extractClaudeMessageText(message);
    if (!text) continue;

    const last = grouped[grouped.length - 1];
    if (last?.sender === message.sender) {
      last.text = `${last.text}\n${text}`.trim();
    } else {
      grouped.push({ sender: message.sender, text });
    }
  }

  if (grouped.length === 0) {
    throw createAppError(
      "E-PARSE-005",
      "No messages found in Claude conversation",
    );
  }

  const contentNodes: ContentBundle["nodes"] = grouped.map((msg, index) => ({
    id: generateId(),
    participantId: msg.sender === "human" ? "user" : "assistant",
    content: msg.text,
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title: data.name,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "Claude", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "claude",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "claude",
      pluginVersion: "1.0.0",
    },
  };
}
