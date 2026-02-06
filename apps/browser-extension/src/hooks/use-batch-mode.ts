import { useState, useCallback } from "react";
import { findAdapterByHostUrl } from "@ctxport/core-adapters/manifest";
import {
  serializeBundle,
  type BundleFormatType,
} from "@ctxport/core-markdown";
import type { Conversation } from "@ctxport/core-schema";
import { writeToClipboard } from "~/lib/utils";

export type BatchState = "normal" | "selecting" | "copying" | "success" | "partial-fail";

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  messageCount: number;
  estimatedTokens: number;
}

export function useBatchMode() {
  const [state, setState] = useState<BatchState>("normal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BatchResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const toggleBatchMode = useCallback(() => {
    setState((prev) => {
      if (prev === "normal") return "selecting";
      setSelected(new Set());
      setResult(null);
      return "normal";
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const copySelected = useCallback(
    async (format: BundleFormatType = "full") => {
      if (selected.size === 0) return;

      setState("copying");
      const ids = Array.from(selected);
      setProgress({ current: 0, total: ids.length });

      const adapter = findAdapterByHostUrl(window.location.href);
      if (!adapter) {
        setState("normal");
        return;
      }

      const conversations: Conversation[] = [];
      let failed = 0;

      for (let i = 0; i < ids.length; i++) {
        try {
          const conv = await adapter.fetchById(ids[i]!);
          conversations.push(conv);
        } catch {
          failed++;
        }

        setProgress({ current: i + 1, total: ids.length });
      }

      if (conversations.length > 0) {
        const serialized = serializeBundle(conversations, { format });
        await writeToClipboard(serialized.markdown);

        setResult({
          total: ids.length,
          succeeded: conversations.length,
          failed,
          messageCount: serialized.messageCount,
          estimatedTokens: serialized.estimatedTokens,
        });
      }

      setState(failed > 0 ? "partial-fail" : "success");

      if (failed === 0) {
        setTimeout(() => {
          setState("normal");
          setSelected(new Set());
          setResult(null);
        }, 2000);
      }
    },
    [selected],
  );

  return {
    state,
    selected,
    result,
    progress,
    toggleBatchMode,
    toggleSelection,
    selectAll,
    clearSelection,
    copySelected,
  };
}
