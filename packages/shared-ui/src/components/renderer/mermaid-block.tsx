"use client";

import { useI18n } from "@ui/i18n";
import mermaid from "mermaid";
import { memo, useEffect, useRef, useState } from "react";

// Initialize mermaid
let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
  });
  mermaidInitialized = true;
}

export interface MermaidBlockProps {
  code: string;
  className?: string;
}

/**
 * Mermaid diagram block component
 * Renders mermaid code as SVG diagrams
 */
export const MermaidBlock = memo(function MermaidBlock({
  code,
  className,
}: MermaidBlockProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initMermaid();

    const renderDiagram = async () => {
      if (!code.trim()) return;

      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
        setSvg("");
      }
    };

    void renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div
        ref={containerRef}
        className={`ctxport-markdown-mermaid-block ctxport-markdown-mermaid-error p-4 bg-gray-50 rounded-lg overflow-auto text-center ${className || ""}`}
      >
        <div className="text-red-600 p-3 bg-red-50 rounded text-sm font-mono whitespace-pre-wrap text-left">
          {t("mermaid.error")}: {error}
        </div>
        <details className="mt-2 text-left">
          <summary className="cursor-pointer text-sm">
            {t("mermaid.viewSource")}
          </summary>
          <pre className="p-3 bg-gray-100 rounded text-[13px] font-mono whitespace-pre-wrap text-left text-gray-600">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        ref={containerRef}
        className={`ctxport-markdown-mermaid-block ctxport-markdown-mermaid-loading my-4 p-4 bg-gray-50 rounded-lg overflow-auto text-center ${className || ""}`}
      >
        <div className="text-gray-500 text-sm">{t("mermaid.loading")}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`ctxport-markdown-mermaid-block my-4 p-4 bg-gray-50 rounded-lg overflow-auto text-center ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
