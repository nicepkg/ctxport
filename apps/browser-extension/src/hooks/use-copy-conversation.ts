import {
  serializeConversation,
  type BundleFormatType,
} from "@ctxport/core-markdown";
import { findPlugin } from "@ctxport/core-plugins";
import { useState, useCallback } from "react";
import { writeToClipboard } from "~/lib/utils";

export type CopyState = "idle" | "loading" | "success" | "error";

export interface CopyResult {
  messageCount: number;
  estimatedTokens: number;
}

export function useCopyConversation() {
  const [state, setState] = useState<CopyState>("idle");
  const [result, setResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(async (format: BundleFormatType = "full") => {
    setState("loading");
    setError(null);
    setResult(null);

    try {
      const plugin = findPlugin(window.location.href);
      if (!plugin) throw new Error("No plugin for this page");

      const bundle = await plugin.extract({
        url: window.location.href,
        document,
      });

      const serialized = serializeConversation(bundle, { format });

      await writeToClipboard(serialized.markdown);

      setResult({
        messageCount: serialized.messageCount,
        estimatedTokens: serialized.estimatedTokens,
      });
      setState("success");

      setTimeout(() => {
        setState("idle");
        setResult(null);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setState("error");

      setTimeout(() => {
        setState("idle");
        setError(null);
      }, 3000);
    }
  }, []);

  return { state, result, error, copy };
}
