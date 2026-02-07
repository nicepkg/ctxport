import type { ContentBundle } from "@ctxport/core-schema";
import { filterNodes, type BundleFormatType } from "./formats";
import { estimateTokens, formatTokenCount } from "./token-estimator";

export interface SerializeOptions {
  format?: BundleFormatType;
  includeFrontmatter?: boolean;
}

export interface SerializeResult {
  markdown: string;
  messageCount: number;
  estimatedTokens: number;
}

function buildFrontmatter(meta: Record<string, string | number>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === "string") {
      // Quote strings that contain special chars
      if (value.includes(":") || value.includes('"') || value.includes("#")) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function serializeConversation(
  bundle: ContentBundle,
  options: SerializeOptions = {},
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options;

  const messageParts = filterNodes(bundle.nodes, bundle.participants, format);
  const body = messageParts.join("\n\n");

  const messageCount = bundle.nodes.length;

  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = {
      ctxport: "v2",
    };

    if (bundle.source.platform) {
      meta.source = bundle.source.platform;
    }
    if (bundle.source.url) {
      meta.url = bundle.source.url;
    }
    if (bundle.title) {
      meta.title = bundle.title;
    }
    meta.date = bundle.source.extractedAt ?? new Date().toISOString();
    meta.nodes = messageCount;
    meta.format = format;

    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  const markdown = sections.join("\n\n");
  const tokens = estimateTokens(markdown);

  return {
    markdown,
    messageCount,
    estimatedTokens: tokens,
  };
}

export function serializeBundle(
  bundles: ContentBundle[],
  options: SerializeOptions = {},
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options;

  const total = bundles.length;
  const allParts: string[] = [];
  let totalMessageCount = 0;

  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i]!;
    const messageParts = filterNodes(bundle.nodes, bundle.participants, format);
    const title = bundle.title ?? "Untitled";
    const source = bundle.source.platform ?? "unknown";
    const msgCount = bundle.nodes.length;
    const url = bundle.source.url ?? "";

    totalMessageCount += msgCount;

    const header = `# [${i + 1}/${total}] ${title}`;
    const meta = `> Source: ${source} | Messages: ${msgCount}${url ? ` | URL: ${url}` : ""}`;

    allParts.push(`${header}\n\n${meta}\n\n${messageParts.join("\n\n")}`);
  }

  const body = allParts.join("\n\n---\n\n");
  const tokens = estimateTokens(body);

  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = {
      ctxport: "v2",
      bundle: "merged" as string,
      conversations: total,
      date: new Date().toISOString(),
      total_messages: totalMessageCount,
      total_tokens: formatTokenCount(tokens),
      format,
    };

    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  return {
    markdown: sections.join("\n\n"),
    messageCount: totalMessageCount,
    estimatedTokens: tokens,
  };
}
