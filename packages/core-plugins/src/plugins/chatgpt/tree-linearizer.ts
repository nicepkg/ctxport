import type { MessageNode } from "./types";

/**
 * Linearize ChatGPT's tree-shaped mapping into an ordered array of node IDs.
 * If currentNodeId is available, walk up the parent chain to get the active branch.
 * Otherwise, fallback to sorting by create_time.
 */
export function buildLinearConversation(
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
    .filter((node): node is MessageNode & { id: string } => Boolean(node?.id))
    .sort(
      (a, b) => (a.message?.create_time ?? 0) - (b.message?.create_time ?? 0),
    );

  return nodes.map((node) => node.id);
}
