import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import { flattenMessageContent } from "./content-flatteners";
import { stripCitationTokens } from "./text-processor";
import { buildLinearConversation } from "./tree-linearizer";
import type { ChatGPTConversationResponse, MessageNode } from "./types";

const HOST_PATTERN = /^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/(?:chat\.openai\.com|chatgpt\.com)\/c\/([a-zA-Z0-9-]+)/;

const SESSION_ENDPOINT = "https://chatgpt.com/api/auth/session";
const API_ENDPOINT = "https://chatgpt.com/backend-api/conversation";
const TOKEN_EXPIRY_SKEW_MS = 60_000;
const DEFAULT_TOKEN_TTL_MS = 10 * 60_000;

export const chatgptPlugin: Plugin = {
  id: "chatgpt",
  version: "1.0.0",
  name: "ChatGPT",

  urls: {
    hosts: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId)
      throw createAppError("E-PARSE-001", "Not a ChatGPT conversation page");

    const data = await fetchConversationWithTokenRetry(conversationId);
    return parseConversation(data, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const data = await fetchConversationWithTokenRetry(conversationId);
    const url = `https://chatgpt.com/c/${conversationId}`;
    return parseConversation(data, url);
  },

  injector: createChatInjector({
    platform: "chatgpt",
    copyButtonSelectors: [
      "main .sticky .flex.items-center.gap-2",
      'main header [class*="flex"][class*="items-center"]',
      'div[data-testid="conversation-header"] .flex.items-center',
    ],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'nav a[href^="/c/"], nav a[href^="/g/"]',
    listItemIdPattern: /\/(?:c|g)\/([a-zA-Z0-9-]+)$/,
    mainContentSelector: "main",
    sidebarSelector: "nav",
  }),

  theme: {
    light: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      fg: "#ffffff",
      secondaryFg: "#ffffff",
    },
    dark: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      fg: "#ffffff",
      secondaryFg: "#ffffff",
    },
  },
};

// --- Internal: URL parsing ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// --- Internal: Token management ---

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let accessTokenCache: AccessTokenCache | null = null;
let accessTokenPromise: Promise<string> | null = null;

async function fetchAndCacheAccessToken(): Promise<string> {
  const response = await fetch(SESSION_ENDPOINT, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `ChatGPT session API responded with ${response.status}`,
    );
  }

  const session = (await response.json()) as {
    accessToken?: string;
    expires?: string;
  };
  if (!session.accessToken) {
    throw createAppError(
      "E-PARSE-005",
      "Cannot retrieve ChatGPT access token from session",
    );
  }

  const parsed = Date.parse(session.expires ?? "");
  accessTokenCache = {
    token: session.accessToken,
    expiresAt: Number.isFinite(parsed)
      ? parsed
      : Date.now() + DEFAULT_TOKEN_TTL_MS,
  };

  return session.accessToken;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && accessTokenCache) {
    if (accessTokenCache.expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now()) {
      return accessTokenCache.token;
    }
  }

  if (!accessTokenPromise) {
    accessTokenPromise = fetchAndCacheAccessToken().finally(() => {
      accessTokenPromise = null;
    });
  }

  return accessTokenPromise;
}

// --- Internal: API fetch with 401 retry ---

class ChatGPTApiError extends Error {
  constructor(readonly status: number) {
    super(`ChatGPT API responded with ${status}`);
  }
}

async function fetchConversation(
  conversationId: string,
  accessToken: string,
): Promise<ChatGPTConversationResponse> {
  const response = await fetch(`${API_ENDPOINT}/${conversationId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ChatGPTApiError(response.status);
  }

  return (await response.json()) as ChatGPTConversationResponse;
}

async function fetchConversationWithTokenRetry(
  conversationId: string,
): Promise<ChatGPTConversationResponse> {
  const cachedToken = await getAccessToken();

  try {
    return await fetchConversation(conversationId, cachedToken);
  } catch (error) {
    if (!(error instanceof ChatGPTApiError) || error.status !== 401) {
      throw error;
    }

    accessTokenCache = null;
    const freshToken = await getAccessToken(true);
    return fetchConversation(conversationId, freshToken);
  }
}

// --- Internal: Parse conversation into ContentBundle ---

function shouldSkipMessage(node: MessageNode): boolean {
  const ct = node.message?.content?.content_type;
  if (ct === "thoughts" || ct === "code") return true;

  const meta = node.message?.metadata;
  if (!meta) return false;
  if (meta.is_visually_hidden_from_conversation) return true;
  if (meta.is_redacted) return true;
  if (meta.is_user_system_message) return true;
  if (meta.reasoning_status) return true;
  return false;
}

async function parseConversation(
  data: ChatGPTConversationResponse,
  url: string,
): Promise<ContentBundle> {
  const mapping = data.mapping ?? {};

  // Linearize tree
  const linear = buildLinearConversation(mapping, data.current_node);
  const nodes = linear
    .map((id) => mapping[id])
    .filter((n): n is MessageNode => n != null);

  // Parse messages
  const contentNodes: ContentBundle["nodes"] = [];
  let order = 0;

  const roleMapping: Record<string, string> = {
    user: "user",
    assistant: "assistant",
    tool: "assistant",
  };

  for (const node of nodes) {
    if (!node.message?.content) continue;

    const role = node.message.author?.role;
    if (role === "system") continue;
    if (shouldSkipMessage(node)) continue;

    const mappedRole = role ? roleMapping[role] : undefined;
    if (!mappedRole) continue;

    let text = await flattenMessageContent(node.message.content, {});
    text = stripCitationTokens(text);
    if (!text.trim()) continue;

    contentNodes.push({
      id: generateId(),
      participantId: mappedRole,
      content: text,
      order: order++,
      type: "message",
    });
  }

  if (contentNodes.length === 0) {
    throw createAppError(
      "E-PARSE-005",
      "No messages found in ChatGPT conversation",
    );
  }

  return {
    id: generateId(),
    title: data.title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "ChatGPT", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "chatgpt",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "chatgpt",
      pluginVersion: "1.0.0",
    },
  };
}
