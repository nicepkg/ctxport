import { estimateTokenCount } from "tokenx";

export function estimateTokens(text: string): number {
  if (!text) return 0;

  return estimateTokenCount(text);
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `~${(tokens / 1000).toFixed(1)}K`;
  }
  return `~${tokens}`;
}
