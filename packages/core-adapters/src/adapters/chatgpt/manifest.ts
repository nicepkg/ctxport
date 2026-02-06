import type { AdapterManifest } from "../../manifest/schema";
import type { AdapterHooks } from "../../manifest/hooks";
import type { MessageNode } from "./shared/types";

// --- 声明层 ---

export const chatgptManifest = {
  id: "chatgpt-ext",
  version: "2.0.0",
  name: "ChatGPT Extension Parser",
  provider: "chatgpt",

  urls: {
    hostPermissions: [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
    ],
    hostPatterns: [
      /^https:\/\/chatgpt\.com\//i,
      /^https:\/\/chat\.openai\.com\//i,
    ],
    conversationUrlPatterns: [
      /^https?:\/\/(?:chat\.openai\.com|chatgpt\.com)\/c\/([a-zA-Z0-9-]+)/,
    ],
  },

  auth: {
    method: "bearer-from-api" as const,
    sessionEndpoint: "https://chatgpt.com/api/auth/session",
    tokenPath: "accessToken",
    expiresPath: "expires",
    tokenTtlMs: 600_000,
  },

  endpoint: {
    urlTemplate:
      "https://chatgpt.com/backend-api/conversation/{conversationId}",
    method: "GET" as const,
    credentials: "include" as const,
    cache: "no-store" as const,
  },

  parsing: {
    role: {
      field: "message.author.role",
      mapping: {
        user: "user" as const,
        assistant: "assistant" as const,
        tool: "assistant" as const,
        system: "skip" as const,
      },
    },
    content: {
      messagesPath: "_linearMessages", // 由 transformResponse 生成
      textPath: "_extractedText", // 由 extractMessageText 处理
      titlePath: "title",
      sortField: "message.create_time",
      sortOrder: "asc" as const,
    },
  },

  injection: {
    copyButton: {
      selectors: [
        "main .sticky .flex.items-center.gap-2",
        'main header [class*="flex"][class*="items-center"]',
        'div[data-testid="conversation-header"] .flex.items-center',
      ],
      position: "prepend" as const,
    },
    listItem: {
      linkSelector: 'nav a[href^="/c/"], nav a[href^="/g/"]',
      idPattern: /\/(?:c|g)\/([a-zA-Z0-9-]+)$/,
      containerSelector: "nav",
    },
    mainContentSelector: "main",
    sidebarSelector: "nav",
  },

  theme: {
    light: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      primaryForeground: "#ffffff",
      secondaryForeground: "#ffffff",
    },
    dark: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      primaryForeground: "#ffffff",
      secondaryForeground: "#ffffff",
    },
  },

  filters: {
    skipWhen: [
      { field: "message.content.content_type", equals: "thoughts" },
      { field: "message.content.content_type", equals: "code" },
      {
        field: "message.metadata.is_visually_hidden_from_conversation",
        equals: true,
      },
      { field: "message.metadata.is_redacted", equals: true },
      { field: "message.metadata.is_user_system_message", equals: true },
      // reasoning_status 使用 matchesPattern 匹配非空字符串（truthy 语义）
      { field: "message.metadata.reasoning_status", matchesPattern: ".+" },
    ],
  },

  conversationUrlTemplate: "https://chatgpt.com/c/{conversationId}",

  meta: {
    reliability: "high" as const,
    coverage: "ChatGPT 全部对话类型（含 GPT-4, o1, Canvas 等）",
    lastVerified: "2026-02-07",
    knownLimitations: [
      "ChatGPT API 限速后需要等待",
      "DALL-E 图片仅保留 alt 文本描述",
    ],
  },
} satisfies AdapterManifest;

// --- 脚本层 ---

/**
 * ChatGPT 需要钩子的原因：
 * 1. API 响应是树状 mapping 结构，需要先线性化
 * 2. 消息内容是复杂的 parts 数组，需要自定义提取
 */
export const chatgptHooks: AdapterHooks = {
  /**
   * ChatGPT 的 API 返回树状 mapping，需要线性化为消息数组。
   */
  transformResponse(raw: unknown) {
    const data = raw as {
      title?: string;
      mapping?: Record<string, MessageNode>;
      current_node?: string;
    };

    const mapping = data.mapping ?? {};
    const linear = buildLinearConversation(mapping, data.current_node);
    const linearMessages = linear
      .map((id) => mapping[id])
      .filter(Boolean);

    return {
      data: { ...data, _linearMessages: linearMessages },
      title: data.title,
    };
  },

  /**
   * ChatGPT 消息的 content 结构复杂（parts 数组含文本、图片、代码等），
   * 需要专用的 content flattener。
   */
  async extractMessageText(rawMessage: unknown) {
    const node = rawMessage as MessageNode;
    if (!node.message?.content) return "";

    // 复用现有的 flattenMessageContent（dynamic import 支持 tree-shaking）
    const { flattenMessageContent } = await import(
      "./shared/content-flatteners"
    );
    const { stripCitationTokens } = await import("./shared/text-processor");

    let text = await flattenMessageContent(node.message.content, {});
    text = stripCitationTokens(text);
    return text;
  },
};

// --- 辅助函数（从现有 adapter 直接迁移） ---

function buildLinearConversation(
  mapping: Record<string, MessageNode>,
  currentNodeId?: string,
): string[] {
  if (currentNodeId && mapping[currentNodeId]) {
    const ids: string[] = [];
    let nodeId: string | undefined = currentNodeId;
    const visited = new Set<string>();

    while (nodeId && !visited.has(nodeId)) {
      visited.add(nodeId);
      ids.push(nodeId);
      nodeId = mapping[nodeId]?.parent;
    }

    return ids.reverse();
  }

  const nodes = Object.values(mapping)
    .filter(
      (node): node is MessageNode & { id: string } => Boolean(node?.id),
    )
    .sort(
      (a, b) =>
        (a.message?.create_time ?? 0) - (b.message?.create_time ?? 0),
    );

  return nodes.map((node) => node.id);
}
