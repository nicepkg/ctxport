import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import type {
  DoubaoChainResponse,
  DoubaoConversationInfoResponse,
  DoubaoMessage,
} from "./types";

const HOST_PATTERN = /^https:\/\/www\.doubao\.com\//i;
const CONVERSATION_PATTERN =
  /^https?:\/\/www\.doubao\.com\/chat\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/;

const API_BASE = "https://www.doubao.com";
const API_PARAMS =
  "version_code=20800&language=zh&device_platform=web&aid=497858&real_aid=497858&pkg_type=release_version&samantha_web=1&use-olympus-account=1";

const FETCH_LIMIT = 20;
const MAX_PAGINATION_PAGES = 100;

export const doubaoPlugin: Plugin = {
  id: "doubao",
  version: "1.0.0",
  name: "豆包",

  urls: {
    hosts: ["https://www.doubao.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId)
      throw createAppError("E-PARSE-001", "Not a Doubao conversation page");

    return fetchAndParse(conversationId, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const url = `https://www.doubao.com/chat/${conversationId}`;
    return fetchAndParse(conversationId, url);
  },

  injector: createChatInjector({
    platform: "doubao",
    copyButtonSelectors: [
      // Right-aligned container in the header row (next to share button)
      'main div[class*="header-height"] > .justify-end',
      // Fallback: broader header area in main
      'main [class*="header"] .justify-end',
      // Fallback: any div with header class containing flex-end area
      'div[class*="header"] > .justify-end',
      // Fallback: standard HTML header element with action area
      "header .justify-end",
    ],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'nav a[href^="/chat/"]',
    listItemIdPattern: /\/chat\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/,
    mainContentSelector: "main",
    sidebarSelector: "nav",
  }),

  theme: {
    light: {
      primary: "#4e6ef2",
      secondary: "#eef1ff",
      fg: "#ffffff",
      secondaryFg: "#6366f1",
    },
    dark: {
      primary: "#4e6ef2",
      secondary: "#1a1a2e",
      fg: "#ffffff",
      secondaryFg: "#a5b4fc",
    },
  },
};

// --- Internal helpers ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

async function fetchAndParse(
  conversationId: string,
  url: string,
): Promise<ContentBundle> {
  const [title, messages] = await Promise.all([
    fetchConversationTitle(conversationId),
    fetchAllMessages(conversationId),
  ]);

  return parseConversation(messages, title, url);
}

// --- API: Conversation info ---

async function fetchConversationTitle(
  conversationId: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `${API_BASE}/im/conversation/info?${API_PARAMS}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; encoding=utf-8",
          Accept: "application/json, text/plain, */*",
          "agw-js-conv": "str",
        },
        credentials: "include",
        body: JSON.stringify({
          cmd: 1110,
          uplink_body: {
            get_conv_info_uplink_body: {
              conversation_id: conversationId,
              ext: {},
              bot_id: "",
              conversation_type: 3,
              option: { need_bot_info: false },
            },
          },
          sequence_id: crypto.randomUUID(),
          channel: 2,
          version: "1",
        }),
      },
    );

    if (!response.ok) return undefined;

    const data = (await response.json()) as DoubaoConversationInfoResponse;
    return data.downlink_body?.get_conv_info_downlink_body?.conversation_info
      ?.name;
  } catch {
    return undefined;
  }
}

// --- API: Fetch all messages with pagination ---

async function fetchAllMessages(
  conversationId: string,
): Promise<DoubaoMessage[]> {
  const allMessages: DoubaoMessage[] = [];
  let anchorIndex = Number.MAX_SAFE_INTEGER;
  let hasMore = true;

  for (let page = 0; page < MAX_PAGINATION_PAGES && hasMore; page++) {
    const response = await fetch(`${API_BASE}/im/chain/single?${API_PARAMS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; encoding=utf-8",
        Accept: "application/json, text/plain, */*",
        "agw-js-conv": "str",
      },
      credentials: "include",
      body: JSON.stringify({
        cmd: 3100,
        uplink_body: {
          pull_singe_chain_uplink_body: {
            conversation_id: conversationId,
            anchor_index: anchorIndex,
            conversation_type: 3,
            direction: 1,
            limit: FETCH_LIMIT,
            ext: {},
            filter: { index_list: [] },
          },
        },
        sequence_id: crypto.randomUUID(),
        channel: 2,
        version: "1",
      }),
    });

    if (!response.ok) {
      throw createAppError(
        "E-PARSE-005",
        `Doubao API responded with ${response.status}`,
      );
    }

    const data = (await response.json()) as DoubaoChainResponse;
    const messages =
      data.downlink_body?.pull_singe_chain_downlink_body?.messages ?? [];

    if (messages.length === 0) break;

    allMessages.push(...messages);

    // Find smallest index_in_conv for next pagination anchor
    const indices = messages
      .map((m) => Number.parseInt(m.index_in_conv, 10))
      .filter((n) => !Number.isNaN(n));
    if (indices.length === 0) break;

    const minIndex = Math.min(...indices);
    if (minIndex >= anchorIndex) break; // no progress — avoid infinite loop
    anchorIndex = minIndex;

    hasMore =
      data.downlink_body?.pull_singe_chain_downlink_body?.has_more !== false &&
      messages.length >= FETCH_LIMIT;
  }

  return allMessages;
}

// --- Markdown heading demotion ---

/** Section header level in output markdown (## = level 2) */
const SECTION_LEVEL = 2;

/**
 * Find the highest (smallest number) ATX heading level in text,
 * skipping fenced code blocks. Returns Infinity if no headings found.
 */
function findMinHeadingLevel(text: string): number {
  const fencePattern = /```[\s\S]*?```/g;
  const headingPattern = /^[ \t]{0,3}(#{1,6})\s/gm;
  let minLevel = Infinity;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(text)) !== null) {
    // Scan non-fence text before this fence
    const segment = text.slice(lastIndex, match.index);
    let hm: RegExpExecArray | null;
    while ((hm = headingPattern.exec(segment)) !== null) {
      const level = hm[1]!.length;
      if (level < minLevel) minLevel = level;
    }
    lastIndex = fencePattern.lastIndex;
  }
  // Scan text after last fence
  const remaining = text.slice(lastIndex);
  let hm: RegExpExecArray | null;
  headingPattern.lastIndex = 0;
  while ((hm = headingPattern.exec(remaining)) !== null) {
    const level = hm[1]!.length;
    if (level < minLevel) minLevel = level;
  }

  return minLevel;
}

/**
 * Demote all ATX headings so that the highest heading in the content
 * starts at SECTION_LEVEL + 1 (i.e., ###), ensuring all content
 * headings nest properly under the ## User / ## Assistant section headers.
 *
 * Examples:
 *   Content has `# H1`     → shift=2  → `#`→`###`, `###`→`#####`
 *   Content has `## H2`    → shift=1  → `##`→`###`, `###`→`####`
 *   Content has `### H3`   → shift=0  → unchanged (already below ##)
 */
function demoteHeadings(text: string): string {
  const minLevel = findMinHeadingLevel(text);

  // How many levels to shift down so all headings sit below ##
  const shift = minLevel <= SECTION_LEVEL ? SECTION_LEVEL + 1 - minLevel : 0;

  if (shift === 0) return text;

  // Split into fence / non-fence segments, shift headings in non-fence parts
  const fencePattern = /```[\s\S]*?```/g;
  const segments: { text: string; isFence: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isFence: false,
      });
    }
    segments.push({ text: match[0], isFence: true });
    lastIndex = fencePattern.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isFence: false });
  }

  return segments
    .map((seg) => {
      if (seg.isFence) return seg.text;
      return seg.text.replace(
        /^([ \t]{0,3})(#{1,6})(\s)/gm,
        (_full, ws: string, hashes: string, sp: string) => {
          const newLevel = Math.min(hashes.length + shift, 6);
          return ws + "#".repeat(newLevel) + sp;
        },
      );
    })
    .join("");
}

// --- Parse conversation into ContentBundle ---

function extractMessageText(message: DoubaoMessage): string {
  // Primary: content_block text (assistant messages)
  if (message.content_block?.length) {
    const texts = message.content_block.flatMap((block) => {
      const text = block.content?.text_block?.text;
      return text ? [text] : [];
    });
    if (texts.length > 0) return texts.join("\n\n");
  }
  // Fallback: top-level content field (user messages are JSON-encoded: {"text":"..."})
  if (message.content?.trim()) {
    const raw = message.content.trim();
    try {
      const parsed = JSON.parse(raw) as { text?: string };
      if (parsed.text) return parsed.text;
    } catch {
      // Not JSON — use raw content
    }
    return raw;
  }
  return "";
}

function parseConversation(
  messages: DoubaoMessage[],
  title: string | undefined,
  url: string,
): ContentBundle {
  // Sort by index_in_conv ascending (chronological)
  const sorted = [...messages].sort(
    (a, b) =>
      Number.parseInt(a.index_in_conv, 10) -
      Number.parseInt(b.index_in_conv, 10),
  );

  // Group consecutive same-role messages
  interface GroupedMessage {
    role: "user" | "assistant";
    text: string;
  }

  const grouped: GroupedMessage[] = [];
  for (const message of sorted) {
    const role = message.user_type === 1 ? "user" : "assistant";
    const text = extractMessageText(message);
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
      "No messages found in Doubao conversation",
    );
  }

  const contentNodes: ContentBundle["nodes"] = grouped.map((msg, index) => ({
    id: generateId(),
    participantId: msg.role === "user" ? "user" : "assistant",
    content: demoteHeadings(msg.text),
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "豆包", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "doubao",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "doubao",
      pluginVersion: "1.0.0",
    },
  };
}
