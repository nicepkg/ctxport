// --- 平台识别 ---

export interface UrlPatternConfig {
  /** 宿主页面匹配模式（用于 content_scripts.matches） */
  hostPermissions: string[];
  /** 宿主页面正则（运行时匹配） */
  hostPatterns: RegExp[];
  /** 会话页面 URL 正则 */
  conversationUrlPatterns: RegExp[];
}

// --- 认证配置 ---

export type AuthMethod = "cookie-session" | "bearer-from-api" | "none";

export interface AuthConfig {
  method: AuthMethod;
  /** bearer-from-api 模式的 session endpoint */
  sessionEndpoint?: string;
  /** 从 session 响应中提取 token 的 JSON path */
  tokenPath?: string;
  /** 从 session 响应中提取过期时间的 JSON path */
  expiresPath?: string;
  /** token 缓存 TTL（毫秒），默认 10 分钟 */
  tokenTtlMs?: number;
}

// --- 数据获取配置 ---

export interface ConversationEndpoint {
  /**
   * URL 模板，支持变量替换：
   * - {conversationId} -- 从 URL 提取的会话 ID
   * - {orgId} -- 从 cookie/DOM 提取的组织 ID（可选）
   */
  urlTemplate: string;
  method: "GET" | "POST";
  /** 额外的请求头 */
  headers?: Record<string, string>;
  /** query 参数模板 */
  queryParams?: Record<string, string>;
  /** POST body 模板 */
  bodyTemplate?: unknown;
  /** 请求选项 */
  credentials: "include" | "omit" | "same-origin";
  cache: "default" | "no-store" | "no-cache" | "reload";
  referrerTemplate?: string;
}

// --- 消息解析规则 ---

export interface RoleMapping {
  /** 从原始数据中哪个字段读取角色 */
  field: string;
  /** 角色值映射：原始值 -> "user" | "assistant" | "skip" */
  mapping: Record<string, "user" | "assistant" | "skip">;
}

export interface ContentExtraction {
  /** 消息数组的 JSON path，支持 "." 分隔的路径 */
  messagesPath: string;
  /** 排序字段的 JSON path（相对于单条消息） */
  sortField?: string;
  /** 排序方向 */
  sortOrder?: "asc" | "desc";
  /** 文本内容的 JSON path（相对于单条消息） */
  textPath: string;
  /** 标题的 JSON path（相对于顶层响应） */
  titlePath?: string;
}

export interface MessageParseConfig {
  role: RoleMapping;
  content: ContentExtraction;
}

// --- UI 注入配置 ---

export interface SelectorFallbacks {
  /** 按优先级排列的 CSS 选择器列表，匹配到第一个即停止 */
  selectors: string[];
  /** 注入位置 */
  position: "prepend" | "append" | "before" | "after";
}

export interface ListItemConfig {
  /** 列表项链接的选择器 */
  linkSelector: string;
  /** 从 href 中提取会话 ID 的正则（第一个捕获组） */
  idPattern: RegExp;
  /** 列表容器选择器（MutationObserver 观察目标） */
  containerSelector?: string;
}

export interface InjectionConfig {
  /** 会话详情页标题栏的复制按钮位置 */
  copyButton: SelectorFallbacks;
  /** 侧边栏列表配置 */
  listItem: ListItemConfig;
  /** 主内容区选择器（观察 copy button 注入时机） */
  mainContentSelector?: string;
  /** 侧边栏选择器（观察 list item 注入时机） */
  sidebarSelector?: string;
}

// --- 主题配置 ---

export interface ThemeTokens {
  primary: string;
  secondary: string;
  primaryForeground: string;
  secondaryForeground: string;
}

export interface ThemeConfig {
  light: ThemeTokens;
  dark?: ThemeTokens;
}

// --- 跳过/过滤规则 ---

export interface SkipRule {
  field: string;
  equals?: unknown;
  exists?: boolean;
  matchesPattern?: string;
}

export interface MessageFilter {
  /** 应该跳过的消息条件 */
  skipWhen?: SkipRule[];
}

// --- 元数据 ---

export interface ManifestMeta {
  /** 可靠性等级 */
  reliability: "high" | "medium" | "low";
  /** 覆盖范围说明 */
  coverage?: string;
  /** 最后验证日期 */
  lastVerified?: string;
  /** 已知限制 */
  knownLimitations?: string[];
}

// === 顶层 Manifest ===

export interface AdapterManifest {
  /** 唯一标识符 */
  id: string;
  /** 版本号 */
  version: string;
  /** 人类可读名称 */
  name: string;
  /** Provider 标识 */
  provider: string;

  /** 平台识别配置 */
  urls: UrlPatternConfig;
  /** 认证配置 */
  auth: AuthConfig;
  /** 会话数据获取端点 */
  endpoint: ConversationEndpoint;
  /** 消息解析规则 */
  parsing: MessageParseConfig;
  /** UI 注入配置 */
  injection: InjectionConfig;
  /** 主题配置 */
  theme: ThemeConfig;
  /** 消息过滤规则 */
  filters?: MessageFilter;
  /** 元数据 */
  meta?: ManifestMeta;

  /**
   * 会话页面 URL 模板，用于从 conversationId 合成 URL。
   * 例: "https://chatgpt.com/c/{conversationId}"
   */
  conversationUrlTemplate: string;
}
