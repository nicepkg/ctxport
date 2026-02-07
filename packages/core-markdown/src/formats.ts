import type { ContentNode, Participant } from "@ctxport/core-schema";

export type BundleFormatType = "full" | "user-only" | "code-only" | "compact";

const CHAT_ROLES = new Set(["user", "assistant", "system"]);

export function filterNodes(
  nodes: ContentNode[],
  participants: Participant[],
  format: BundleFormatType,
): string[] {
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const getLabel = (node: ContentNode) => {
    const p = participantMap.get(node.participantId);
    if (!p) return "Assistant";
    const role = p.role ?? "assistant";
    if (CHAT_ROLES.has(role)) return chatRoleLabel(role);
    // Non-chat platforms (GitHub, etc.) — use participant name
    return p.name;
  };

  switch (format) {
    case "full":
      return formatFull(nodes, getLabel);
    case "user-only":
      return formatUserOnly(nodes, getLabel);
    case "code-only":
      return formatCodeOnly(nodes, getLabel);
    case "compact":
      return formatCompact(nodes, getLabel);
  }
}

function chatRoleLabel(role: string): string {
  if (role === "user") return "User";
  if (role === "system") return "System";
  return "Assistant";
}

function formatFull(
  nodes: ContentNode[],
  getLabel: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    parts.push(`## ${getLabel(node)}\n\n${node.content}`);
  }

  return parts;
}

function formatUserOnly(
  nodes: ContentNode[],
  getLabel: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    if (getLabel(node) !== "User") continue;
    parts.push(`## User\n\n${node.content}`);
  }

  return parts;
}

function formatCodeOnly(
  nodes: ContentNode[],
  getLabel: (node: ContentNode) => string,
): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const parts: string[] = [];

  for (const node of nodes) {
    const matches = node.content.match(codeBlockRegex);
    if (matches) {
      parts.push(`## ${getLabel(node)}\n\n${matches.join("\n\n")}`);
    }
  }

  return parts;
}

function formatCompact(
  nodes: ContentNode[],
  getLabel: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    let content = node.content;

    // Remove comments inside code blocks
    content = content.replace(
      /(```\w*\n)([\s\S]*?)(```)/g,
      (_match, open: string, code: string, close: string) => {
        const cleaned = code
          .split("\n")
          .filter((line) => {
            const trimmed = line.trim();
            return (
              trimmed !== "" &&
              !trimmed.startsWith("//") &&
              !trimmed.startsWith("#") &&
              !trimmed.startsWith("/*") &&
              !trimmed.startsWith("*") &&
              !trimmed.startsWith("*/")
            );
          })
          .join("\n");
        return `${open}${cleaned}\n${close}`;
      },
    );

    // Collapse multiple blank lines to single
    content = content.replace(/\n{3,}/g, "\n\n");

    parts.push(`## ${getLabel(node)}\n\n${content}`);
  }

  return parts;
}
