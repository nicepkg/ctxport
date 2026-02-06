import type {
  Adapter,
  AdapterInput,
  Conversation,
  ExtInput,
  Provider,
} from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import { buildConversation, type RawMessage } from "../base";
import type { AdapterManifest } from "./schema";
import type { AdapterHooks, HookContext } from "./hooks";
import { getByPath } from "./utils";

export class ManifestAdapter implements Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly supportedInputTypes = ["ext"] as const;

  private readonly manifest: AdapterManifest;
  private readonly hooks: AdapterHooks;

  // bearer token 缓存（仅 bearer-from-api 模式）
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor(manifest: AdapterManifest, hooks: AdapterHooks = {}) {
    this.manifest = manifest;
    this.hooks = hooks;
    this.id = manifest.id;
    this.version = manifest.version;
    this.name = manifest.name;
  }

  canHandle(input: AdapterInput): boolean {
    if (input.type !== "ext") return false;
    return this.manifest.urls.conversationUrlPatterns.some((p) =>
      p.test(input.url),
    );
  }

  async parse(input: AdapterInput): Promise<Conversation> {
    if (input.type !== "ext") {
      throw new Error(`${this.name} only handles ext input`);
    }

    const extInput = input as ExtInput;
    const conversationId = this.extractConversationId(extInput.url);
    if (!conversationId) {
      throw createAppError(
        "E-PARSE-001",
        `Invalid conversation URL for ${this.name}`,
      );
    }

    const ctx: HookContext = {
      url: extInput.url,
      document: extInput.document,
      conversationId,
      provider: this.manifest.provider,
    };

    // 1. 获取认证信息
    const authVars = this.resolveAuth(ctx);

    // 2. 获取 bearer token（如果需要）
    if (this.manifest.auth.method === "bearer-from-api") {
      const token = await this.getAccessToken();
      authVars._bearerToken = token;
    }

    // 3. 构建请求
    const templateVars = { conversationId, ...authVars };
    const requestUrl = this.buildRequestUrl(ctx, templateVars);
    const headers = this.buildHeaders(authVars);

    // 4. 发起请求
    const response = await this.fetchConversation(requestUrl, headers);

    // 5. 解析响应
    const { rawMessages, title } = await this.parseResponse(response, ctx);

    if (rawMessages.length === 0) {
      throw createAppError(
        "E-PARSE-005",
        `No messages found. ${this.name} API response may have changed.`,
      );
    }

    // 6. 构建 Conversation
    return buildConversation(rawMessages, {
      sourceType: "extension-current",
      provider: this.manifest.provider as Provider,
      adapterId: this.id,
      adapterVersion: this.version,
      title,
      url: extInput.url,
    });
  }

  /**
   * 按 conversationId 获取远程对话并构建 Conversation。
   * 供 list-copy-icon / batch-mode 调用，不需要真实的页面 URL 和 document。
   */
  async fetchById(conversationId: string): Promise<Conversation> {
    const syntheticUrl = this.manifest.conversationUrlTemplate.replace(
      "{conversationId}",
      conversationId,
    );

    const ctx: HookContext = {
      url: syntheticUrl,
      document: globalThis.document,
      conversationId,
      provider: this.manifest.provider,
    };

    const authVars = this.hooks.extractAuthHeadless
      ? await this.hooks.extractAuthHeadless()
      : this.resolveAuth(ctx);

    if (this.manifest.auth.method === "bearer-from-api") {
      const token = await this.getAccessToken();
      authVars._bearerToken = token;
    }

    const templateVars = { conversationId, ...authVars };
    const requestUrl = this.buildRequestUrl(ctx, templateVars);
    const headers = this.buildHeaders(authVars);
    const response = await this.fetchConversation(requestUrl, headers);
    const { rawMessages, title } = await this.parseResponse(response, ctx);

    if (rawMessages.length === 0) {
      throw createAppError(
        "E-PARSE-005",
        `No messages found for ${this.name} conversation ${conversationId}`,
      );
    }

    return buildConversation(rawMessages, {
      sourceType: "extension-list",
      provider: this.manifest.provider as Provider,
      adapterId: this.id,
      adapterVersion: this.version,
      title,
      url: syntheticUrl,
    });
  }

  // --- 内部方法 ---

  private extractConversationId(url: string): string | null {
    if (this.hooks.extractConversationId) {
      return this.hooks.extractConversationId(url);
    }
    for (const pattern of this.manifest.urls.conversationUrlPatterns) {
      const match = pattern.exec(url);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private resolveAuth(ctx: HookContext): Record<string, string> {
    if (this.hooks.extractAuth) {
      return this.hooks.extractAuth(ctx) ?? {};
    }
    return {};
  }

  private buildRequestUrl(
    ctx: HookContext,
    templateVars: Record<string, string>,
  ): string {
    if (this.hooks.buildRequestUrl) {
      return this.hooks.buildRequestUrl({ ...ctx, templateVars });
    }

    let url = this.manifest.endpoint.urlTemplate;
    for (const [key, value] of Object.entries(templateVars)) {
      if (key.startsWith("_")) continue; // 跳过内部变量（如 _bearerToken）
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }

    const params = this.manifest.endpoint.queryParams;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        let resolved = value;
        for (const [varKey, varValue] of Object.entries(templateVars)) {
          if (varKey.startsWith("_")) continue;
          resolved = resolved.replace(`{${varKey}}`, varValue);
        }
        searchParams.set(key, resolved);
      }
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  private buildHeaders(
    authVars: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.manifest.endpoint.headers,
    };

    if (
      this.manifest.auth.method === "bearer-from-api" &&
      authVars._bearerToken
    ) {
      headers["Authorization"] = `Bearer ${authVars._bearerToken}`;
    }

    return headers;
  }

  private async fetchConversation(
    url: string,
    headers: Record<string, string>,
  ): Promise<unknown> {
    const { endpoint } = this.manifest;
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      credentials: endpoint.credentials,
      cache: endpoint.cache,
      referrer: endpoint.referrerTemplate
        ? endpoint.referrerTemplate
        : undefined,
    });

    if (!response.ok) {
      // bearer token 模式下，401 时自动重试
      if (
        response.status === 401 &&
        this.manifest.auth.method === "bearer-from-api"
      ) {
        this.tokenCache = null;
        const freshToken = await this.getAccessToken(true);
        headers["Authorization"] = `Bearer ${freshToken}`;
        const retryResponse = await fetch(url, {
          method: endpoint.method,
          headers,
          credentials: endpoint.credentials,
          cache: endpoint.cache,
        });
        if (!retryResponse.ok) {
          throw createAppError(
            "E-PARSE-005",
            `${this.name} API responded with ${retryResponse.status}`,
          );
        }
        return retryResponse.json();
      }

      throw createAppError(
        "E-PARSE-005",
        `${this.name} API responded with ${response.status}`,
      );
    }

    return response.json();
  }

  private async parseResponse(
    raw: unknown,
    ctx: HookContext,
  ): Promise<{ rawMessages: RawMessage[]; title?: string }> {
    // 1. transformResponse 钩子：预处理（如树状 -> 线性化）
    let data: unknown = raw;
    let hookTitle: string | undefined;
    if (this.hooks.transformResponse) {
      const result = this.hooks.transformResponse(raw, ctx);
      data = result.data;
      hookTitle = result.title;
    }

    // 2. 提取标题
    const { parsing } = this.manifest;
    const title =
      hookTitle ??
      (parsing.content.titlePath
        ? (getByPath(data, parsing.content.titlePath) as string | undefined)
        : undefined);

    // 3. 提取消息列表
    const rawMessageList = getByPath(data, parsing.content.messagesPath);
    if (!Array.isArray(rawMessageList)) {
      return { rawMessages: [], title };
    }

    // 4. 排序
    let sorted = rawMessageList;
    if (parsing.content.sortField) {
      const field = parsing.content.sortField;
      const order = parsing.content.sortOrder;
      sorted = [...rawMessageList].sort((a, b) => {
        const va = getByPath(a, field) ?? 0;
        const vb = getByPath(b, field) ?? 0;
        return order === "asc"
          ? (va as number) - (vb as number)
          : (vb as number) - (va as number);
      });
    }

    // 5. 过滤 + 解析每条消息（用 Promise.all 并行处理 extractMessageText）
    const messagePromises = sorted.map(async (rawMsg) => {
      // 过滤规则
      if (this.shouldSkip(rawMsg)) return null;

      // 角色映射
      const roleValue = getByPath(rawMsg, parsing.role.field);
      const mappedRole = parsing.role.mapping[String(roleValue)];
      if (!mappedRole || mappedRole === "skip") return null;

      // 内容提取（支持异步）
      let text: string;
      if (this.hooks.extractMessageText) {
        text = await this.hooks.extractMessageText(rawMsg, ctx);
      } else {
        text = String(getByPath(rawMsg, parsing.content.textPath) ?? "");
      }

      if (!text.trim()) return null;

      return { role: mappedRole, content: text } as RawMessage;
    });

    const results = await Promise.all(messagePromises);
    const messages = results.filter(Boolean) as RawMessage[];

    // 6. afterParse 钩子
    const finalMessages = this.hooks.afterParse
      ? this.hooks.afterParse(messages, ctx)
      : messages;

    return { rawMessages: finalMessages, title };
  }

  private shouldSkip(rawMsg: unknown): boolean {
    const rules = this.manifest.filters?.skipWhen;
    if (!rules || rules.length === 0) return false;

    for (const rule of rules) {
      const value = getByPath(rawMsg, rule.field);

      if (rule.equals !== undefined && value === rule.equals) return true;
      if (rule.exists === true && value != null) return true;
      if (rule.exists === false && value == null) return true;
      if (rule.matchesPattern && typeof value === "string") {
        try {
          if (new RegExp(rule.matchesPattern).test(value)) return true;
        } catch {
          // Invalid regex in matchesPattern — skip this rule silently
        }
      }
    }

    return false;
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.tokenCache) {
      if (this.tokenCache.expiresAt - 60_000 > Date.now()) {
        return this.tokenCache.token;
      }
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchAccessToken().finally(() => {
        this.tokenPromise = null;
      });
    }

    return this.tokenPromise;
  }

  private async fetchAccessToken(): Promise<string> {
    const { auth } = this.manifest;
    if (!auth.sessionEndpoint) {
      throw createAppError("E-PARSE-005", "No session endpoint configured");
    }

    const response = await fetch(auth.sessionEndpoint, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw createAppError(
        "E-PARSE-005",
        `Session API responded with ${response.status}`,
      );
    }

    const session = await response.json();
    const token = auth.tokenPath
      ? getByPath(session, auth.tokenPath)
      : undefined;

    if (!token || typeof token !== "string") {
      throw createAppError(
        "E-PARSE-005",
        "Cannot retrieve access token from session",
      );
    }

    const expiresAt = auth.expiresPath
      ? Date.parse(String(getByPath(session, auth.expiresPath) ?? ""))
      : Date.now() + (auth.tokenTtlMs ?? 600_000);

    this.tokenCache = {
      token,
      expiresAt: Number.isFinite(expiresAt)
        ? expiresAt
        : Date.now() + (auth.tokenTtlMs ?? 600_000),
    };

    return token;
  }
}
