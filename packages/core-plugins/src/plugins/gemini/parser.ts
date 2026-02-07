import { createAppError } from "@ctxport/core-schema";
import type { GeminiRuntimeParams } from "./types";

const BATCH_EXECUTE_ENDPOINT =
  "https://gemini.google.com/_/BardChatUi/data/batchexecute";

const GEMINI_IMAGE_URL_PATTERN =
  /^https:\/\/lh3\.googleusercontent\.com\/gg(?:-dl)?\//;

// --- batchexecute API ---

export async function fetchConversationPayload(
  conversationId: string,
  runtimeParams: GeminiRuntimeParams,
): Promise<unknown> {
  const rpcId = "hNvQHb";

  const query = new URLSearchParams({
    rpcids: rpcId,
    "source-path": `/app/${conversationId}`,
    bl: runtimeParams.bl,
    "f.sid": runtimeParams.fSid,
    hl: runtimeParams.hl,
    _reqid: `${1_000_000 + Math.floor(Math.random() * 9_000_000)}`,
    rt: "c",
  });

  const fReq = JSON.stringify([
    [
      [
        rpcId,
        JSON.stringify([
          `c_${conversationId}`,
          100,
          null,
          1,
          [0],
          [4],
          null,
          1,
        ]),
        null,
        "generic",
      ],
    ],
  ]);
  const body = new URLSearchParams({ "f.req": fReq });
  if (runtimeParams.at) {
    body.set("at", runtimeParams.at);
  }

  const response = await fetch(
    `${BATCH_EXECUTE_ENDPOINT}?${query.toString()}`,
    {
      method: "POST",
      mode: "cors",
      credentials: "include",
      cache: "no-store",
      referrer: `https://gemini.google.com/app/${conversationId}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        Origin: "https://gemini.google.com",
        "X-Same-Domain": "1",
      },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `Gemini API responded with ${response.status}`,
    );
  }

  const responseText = await response.text();
  const payloadString = extractPayloadFromResponse(responseText, rpcId);

  if (!payloadString) {
    throw createAppError(
      "E-PARSE-005",
      "Cannot locate Gemini payload in batchexecute response",
    );
  }

  try {
    return JSON.parse(payloadString) as unknown;
  } catch {
    throw createAppError("E-PARSE-005", "Gemini payload is not valid JSON");
  }
}

// --- Response parsing ---

function findRpcPayload(node: unknown, rpcId: string): string | null {
  if (!Array.isArray(node)) {
    return null;
  }

  if (
    node.length >= 3 &&
    node[0] === "wrb.fr" &&
    node[1] === rpcId &&
    typeof node[2] === "string"
  ) {
    return node[2];
  }

  for (const child of node) {
    const payload = findRpcPayload(child, rpcId);
    if (payload) {
      return payload;
    }
  }

  return null;
}

function extractPayloadFromResponse(
  responseText: string,
  rpcId: string,
): string | null {
  const lines = responseText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === ")]}'") {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const payload = findRpcPayload(parsed, rpcId);
      if (payload) {
        return payload;
      }
    } catch {
      // Ignore non-JSON lines.
    }
  }

  return null;
}

// --- Message extraction ---

interface ParsedMessage {
  role: "user" | "assistant";
  content: string;
}

function normalizeText(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function findAllStrings(root: unknown): string[] {
  const out: string[] = [];
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();

    if (typeof current === "string") {
      out.push(current);
      continue;
    }

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i -= 1) {
        stack.push(current[i]);
      }
      continue;
    }

    if (current && typeof current === "object") {
      const values = Object.values(current as Record<string, unknown>);
      for (let i = values.length - 1; i >= 0; i -= 1) {
        stack.push(values[i]);
      }
    }
  }

  return out;
}

function extractGeminiImageUrls(node: unknown): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const value of findAllStrings(node)) {
    const url = value.trim();
    if (!GEMINI_IMAGE_URL_PATTERN.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

function isLikelyMessageText(content: string): boolean {
  const text = normalizeText(content);
  if (!text) return false;
  if (text.startsWith("http://") || text.startsWith("https://")) return false;
  if (text.includes("googleusercontent.com/image_generation_content/"))
    return false;
  if (/^(?:rc_|r_|c_)[a-zA-Z0-9_]+$/.test(text)) return false;
  if (/^[A-Za-z0-9+/=_-]{48,}$/.test(text)) return false;
  return /[A-Za-z0-9\u4e00-\u9fff]/.test(text);
}

function findFirstString(node: unknown): string | null {
  const stack: unknown[] = [node];

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === "string") {
      if (isLikelyMessageText(current)) {
        return normalizeText(current);
      }
      continue;
    }

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i -= 1) {
        stack.push(current[i]);
      }
      continue;
    }

    if (current && typeof current === "object") {
      const values = Object.values(current as Record<string, unknown>);
      for (let i = values.length - 1; i >= 0; i -= 1) {
        stack.push(values[i]);
      }
    }
  }

  return null;
}

function tryExtractUserMessage(node: unknown[]): string | null {
  if (
    node.length < 3 ||
    node[1] !== 1 ||
    node[2] !== null ||
    !Array.isArray(node[0])
  ) {
    return null;
  }

  const content = findFirstString(node[0]);
  return content && isLikelyMessageText(content)
    ? normalizeText(content)
    : null;
}

function tryExtractAssistantMessage(node: unknown[]): string | null {
  const messageId = node[0];
  if (typeof messageId !== "string" || !/^rc_[a-zA-Z0-9]+$/.test(messageId)) {
    return null;
  }

  const text = findFirstString(node[1]);
  const normalizedText =
    text && isLikelyMessageText(text) ? normalizeText(text) : "";
  const imageUrls = extractGeminiImageUrls(node);

  if (!normalizedText && imageUrls.length === 0) {
    return null;
  }

  const imageMarkdown = imageUrls.map((url) => `![Generated image](${url})`);
  // For image-only assistant turns, keep only the latest URL.
  const effectiveImageMarkdown =
    !normalizedText && imageMarkdown.length > 1
      ? [imageMarkdown[imageMarkdown.length - 1]!]
      : imageMarkdown;

  if (normalizedText && imageMarkdown.length > 0) {
    return `${normalizedText}\n\n${effectiveImageMarkdown.join("\n")}`;
  }

  if (normalizedText) {
    return normalizedText;
  }

  return effectiveImageMarkdown.join("\n");
}

function dedupeMessages(messages: ParsedMessage[]): ParsedMessage[] {
  const deduped: ParsedMessage[] = [];

  for (const message of messages) {
    const content = normalizeText(message.content);
    if (!content) continue;

    const previous = deduped[deduped.length - 1];
    if (previous?.role === message.role && previous.content === content) {
      continue;
    }

    deduped.push({ role: message.role, content });
  }

  return deduped;
}

export function extractMessagesFromPayload(payload: unknown): ParsedMessage[] {
  const collected: ParsedMessage[] = [];
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!Array.isArray(node)) continue;

    const userText = tryExtractUserMessage(node);
    if (userText) {
      collected.push({ role: "user", content: userText });
    }

    const assistantText = tryExtractAssistantMessage(node);
    if (assistantText) {
      collected.push({ role: "assistant", content: assistantText });
    }

    for (let i = node.length - 1; i >= 0; i -= 1) {
      stack.push(node[i]);
    }
  }

  return dedupeMessages(collected);
}
