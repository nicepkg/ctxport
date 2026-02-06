import type { RawMessage } from "../base";

/**
 * 钩子函数的运行时上下文。
 * 框架注入，钩子只读访问。
 */
export interface HookContext {
  /** 当前页面 URL */
  url: string;
  /** 当前页面 document 对象（仅 ext 模式可用） */
  document: Document;
  /** 从 manifest.urls 提取的会话 ID */
  conversationId: string;
  /** manifest 中声明的 provider */
  provider: string;
}

/**
 * Adapter 生命周期钩子。
 * 所有钩子都是可选的纯函数（或 async 纯函数）。
 */
export interface AdapterHooks {
  // --- 认证阶段 ---

  /**
   * 从浏览器环境提取认证信息（如 cookie 中的 orgId）。
   * 返回 key-value 对，会被注入到 URL 模板和请求头中。
   */
  extractAuth?: (ctx: HookContext) => Record<string, string> | null;

  /**
   * 在无完整 HookContext 的环境（list-copy-icon, batch-mode）中提取认证信息。
   * 运行在 content script 中，可以访问 document.cookie 但不需要完整的 HookContext。
   * 如果未定义，fetchById 会用 globalThis.document 构造最小 HookContext 调用 extractAuth。
   */
  extractAuthHeadless?: () => Promise<Record<string, string>> | Record<string, string>;

  // --- 请求阶段 ---

  /**
   * 自定义会话 ID 提取逻辑。
   * 默认行为：从 URL 中用正则提取。
   */
  extractConversationId?: (url: string) => string | null;

  /**
   * 自定义请求 URL 构建。
   * 返回完整 URL 字符串。
   */
  buildRequestUrl?: (
    ctx: HookContext & { templateVars: Record<string, string> },
  ) => string;

  // --- 响应阶段 ---

  /**
   * 在标准解析之前预处理 API 响应。
   * 用于响应结构 normalize（如 ChatGPT 的 mapping -> linear）。
   */
  transformResponse?: (
    raw: unknown,
    ctx: HookContext,
  ) => { data: unknown; title?: string };

  /**
   * 自定义单条消息的文本提取（支持异步）。
   * 当消息内容结构复杂（如 ChatGPT 的 parts 数组）时使用。
   */
  extractMessageText?: (
    rawMessage: unknown,
    ctx: HookContext,
  ) => string | Promise<string>;

  /**
   * 在标准解析之后对消息列表做后处理。
   * 用于合并连续同角色消息、去重等。
   */
  afterParse?: (messages: RawMessage[], ctx: HookContext) => RawMessage[];
}
