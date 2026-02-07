import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import type { DeepSeekHistoryResponse } from "./types";

const HOST_PATTERN = /^https:\/\/chat\.deepseek\.com\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/chat\.deepseek\.com\/a\/chat\/(?:s\/)?([a-zA-Z0-9-]+)/;
const API_BASE = "https://chat.deepseek.com/api/v0";

export const deepseekPlugin: Plugin = {
  id: "deepseek",
  version: "1.0.0",
  name: "DeepSeek",

  urls: {
    hosts: ["https://chat.deepseek.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const sessionId = extractSessionId(ctx.url);
    if (!sessionId)
      throw createAppError("E-PARSE-001", "Not a DeepSeek conversation page");

    const token = extractAuthToken();
    if (!token)
      throw createAppError("E-PARSE-005", "Cannot find DeepSeek auth token");

    const data = await fetchHistory(sessionId, token);
    return parseConversation(data, ctx.url);
  },

  async fetchById(sessionId: string): Promise<ContentBundle> {
    const token = extractAuthToken();
    if (!token)
      throw createAppError("E-PARSE-005", "Cannot find DeepSeek auth token");

    const data = await fetchHistory(sessionId, token);
    const url = `https://chat.deepseek.com/a/chat/s/${sessionId}`;
    return parseConversation(data, url);
  },

  injector: createChatInjector({
    platform: "deepseek",
    copyButtonSelectors: [
      // Container holding attachment + send buttons (found via hidden file input)
      'div:has(> input[type="file"])',
    ],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'a[href*="/a/chat/"]',
    listItemIdPattern: /\/a\/chat\/(?:s\/)?([a-zA-Z0-9-]+)$/,
    mainContentSelector:
      'main, [class*="chat-container"], [class*="conversation"]',
    sidebarSelector: 'nav, [class*="sidebar"], [class*="session-list"]',
  }),

  theme: {
    light: {
      primary: "#4d6bfe",
      secondary: "#eef1ff",
      fg: "#ffffff",
      secondaryFg: "#6366f1",
    },
    dark: {
      primary: "#4d6bfe",
      secondary: "#1a1a2e",
      fg: "#ffffff",
      secondaryFg: "#a5b4fc",
    },
  },
};

// --- Internal: URL parsing ---

function extractSessionId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// --- Internal: Auth ---

function extractAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("userToken");
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && "value" in parsed) {
      return String((parsed as Record<string, unknown>).value);
    }
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

// --- Internal: API fetch ---

async function fetchHistory(
  sessionId: string,
  token: string,
): Promise<DeepSeekHistoryResponse> {
  const response = await fetch(
    `${API_BASE}/chat/history_messages?chat_session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-app-version": "20241129.1",
        "x-client-locale": "en_US",
        "x-client-platform": "web",
      },
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `DeepSeek API responded with ${response.status}`,
    );
  }

  return (await response.json()) as DeepSeekHistoryResponse;
}

// --- Internal: Parse conversation into ContentBundle ---

function normalizeRole(role: string): "user" | "assistant" | null {
  const lower = role.toLowerCase();
  if (lower === "user") return "user";
  if (lower === "assistant") return "assistant";
  return null;
}

function parseConversation(
  data: DeepSeekHistoryResponse,
  url: string,
): ContentBundle {
  const messages = data.data?.biz_data?.chat_messages ?? [];
  const title = data.data?.biz_data?.chat_session?.title;

  // Sort by message_id (ascending) for chronological order
  const sorted = [...messages].sort(
    (a, b) => (a.message_id ?? 0) - (b.message_id ?? 0),
  );

  // Group consecutive same-role messages
  interface GroupedMessage {
    role: "user" | "assistant";
    text: string;
  }

  const grouped: GroupedMessage[] = [];
  for (const message of sorted) {
    const role = normalizeRole(message.role);
    if (!role) continue;

    // Use content only (skip thinking_content — DeepThink reasoning)
    const text = message.content?.trim();
    if (!text) continue;

    const last = grouped[grouped.length - 1];
    if (last?.role === role) {
      last.text = `${last.text}\n${text}`.trim();
    } else {
      grouped.push({ role, text });
    }
  }

  if (grouped.length === 0) {
    throw createAppError(
      "E-PARSE-005",
      "No messages found in DeepSeek conversation",
    );
  }

  const contentNodes: ContentBundle["nodes"] = grouped.map((msg, index) => ({
    id: generateId(),
    participantId: msg.role === "user" ? "user" : "assistant",
    content: msg.text,
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "DeepSeek", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "deepseek",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "deepseek",
      pluginVersion: "1.0.0",
    },
  };
}
