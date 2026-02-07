import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
  type BundledTheme,
} from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;
let highlighter: Highlighter | null = null;

// LRU Cache for highlighted code
const CACHE_SIZE = 100;
const highlightCache = new Map<string, string>();
const cacheOrder: string[] = [];

/**
 * Simple hash function for cache keys
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Generate cache key from code, language, and theme
 */
function getCacheKey(code: string, lang: string, theme: string): string {
  return `${lang}:${theme}:${simpleHash(code)}`;
}

/**
 * Common languages to pre-load for better performance
 */
const COMMON_LANGUAGES: BundledLanguage[] = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "sql",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "bash",
  "shell",
];

/**
 * Default themes to pre-load
 */
const DEFAULT_THEMES: BundledTheme[] = ["github-dark", "github-light"];

/**
 * Initialize the Shiki highlighter
 */
export async function initHighlighter(): Promise<Highlighter> {
  if (highlighter) {
    return highlighter;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = createHighlighter({
    themes: DEFAULT_THEMES,
    langs: COMMON_LANGUAGES,
  });

  highlighter = await highlighterPromise;
  return highlighter;
}

/**
 * Get the current highlighter instance (must call initHighlighter first)
 */
export function getHighlighter(): Highlighter | null {
  return highlighter;
}

/**
 * Highlight code with Shiki (with LRU caching)
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: BundledTheme = "github-dark",
): Promise<string> {
  // Normalize language name
  const lang = normalizeLanguage(language);
  const key = getCacheKey(code, lang, theme);

  // Check cache first
  if (highlightCache.has(key)) {
    return highlightCache.get(key)!;
  }

  const hl = await initHighlighter();

  // Check if language is loaded
  const loadedLangs = hl.getLoadedLanguages();
  if (!loadedLangs.includes(lang as BundledLanguage)) {
    // Try to load the language dynamically
    try {
      await hl.loadLanguage(lang as BundledLanguage);
    } catch {
      // Fall back to plaintext if language is not supported
      const html = hl.codeToHtml(code, { lang: "text", theme });
      const sanitized = sanitizeShikiHtml(html);
      addToCache(key, sanitized);
      return sanitized;
    }
  }

  const html = hl.codeToHtml(code, { lang, theme });
  const sanitized = sanitizeShikiHtml(html);
  addToCache(key, sanitized);
  return sanitized;
}

/**
 * Add entry to cache with LRU eviction
 */
function addToCache(key: string, html: string): void {
  // LRU eviction
  if (cacheOrder.length >= CACHE_SIZE) {
    const oldest = cacheOrder.shift()!;
    highlightCache.delete(oldest);
  }
  highlightCache.set(key, html);
  cacheOrder.push(key);
}

/**
 * Synchronously highlight code (returns plain text if highlighter not ready)
 */
export function highlightCodeSync(
  code: string,
  language: string,
  theme: BundledTheme = "github-dark",
): string {
  if (!highlighter) {
    return escapeHtml(code);
  }

  const lang = normalizeLanguage(language);
  const loadedLangs = highlighter.getLoadedLanguages();

  if (!loadedLangs.includes(lang as BundledLanguage)) {
    return highlighter.codeToHtml(code, { lang: "text", theme });
  }

  return highlighter.codeToHtml(code, { lang, theme });
}

/**
 * Normalize language aliases
 */
function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();

  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    cs: "csharp",
    "c++": "cpp",
    "c#": "csharp",
    sh: "bash",
    zsh: "bash",
    yml: "yaml",
    md: "markdown",
    plaintext: "text",
    plain: "text",
    "": "text",
  };

  return aliases[normalized] ?? normalized;
}

/**
 * Escape HTML for fallback rendering
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Remove Shiki pre background styles so code block background is controlled
 * by ctxport theme tokens consistently in preview/export.
 */
function sanitizeShikiHtml(html: string): string {
  return html.replace(
    /<pre([^>]*\bclass="[^"]*\bshiki\b[^"]*"[^>]*)>/g,
    (match, attrs: string) => {
      const styleRegex = /\sstyle="([^"]*)"/;
      const styleMatch = styleRegex.exec(attrs);
      if (!styleMatch) return match;

      const styleValue = styleMatch[1];
      if (typeof styleValue !== "string") return match;

      const cleanedStyle = styleValue
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((decl) => {
          const lowerDecl = decl.toLowerCase();
          return (
            !lowerDecl.startsWith("background:") &&
            !lowerDecl.startsWith("background-color:")
          );
        })
        .join("; ");

      if (!cleanedStyle) {
        return `<pre${attrs.replace(styleRegex, "")}>`;
      }

      return `<pre${attrs.replace(styleRegex, ` style="${cleanedStyle}"`)}>`;
    },
  );
}
