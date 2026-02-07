# ADR: Plugin System Architecture

> 版本：v1.0 | 日期：2026-02-07
> 方法论：Werner Vogels — Everything Fails, API First, You Build It You Run It
> 前置文档：
> - ADR Adapter V2 Architecture (docs/cto/adr-adapter-v2-architecture.md)
> - DHH Adapter V2 Refactor Plan (docs/fullstack/adapter-v2-refactor-plan.md)
> - Product Platform Requirements (docs/product/adapter-v2-platform-requirements.md)

---

## 0. Context（为什么重新设计）

### 上轮的问题

上一轮 CTO 设计了 V2 Adapter 架构，DHH 做了大幅简化。创始人更认可 DHH 的方向。但两个方案都有一个根本问题：**它们在旧概念上打补丁**。

V2 方案保留了 V1 的全部概念（`AdapterManifest`、`ManifestAdapter`、`AdapterHooks`、`HookContext`、声明式 parsing config），然后在上面叠加了 `V2Adapter`、`V1AdapterBridge`、`ContentBundle` 等新概念。产品没发布，没有用户，没有兼容负担。在旧地基上建新楼不如直接重建。

### 创始人的明确指示

1. **不叫 adapter，叫 Plugin** — 更自由、更通用
2. **不要兼容层** — 产品没发布，直接改现有代码
3. **面向任意网站** — 不局限于 AI 聊天
4. **DHH 务实风格** — 不过度工程化，三次重复再抽象
5. **Plugin 要足够自由** — 不要过度约束 Plugin 能做什么

### 这次的核心决策

**砍掉所有旧概念，从零设计 Plugin 系统。**

不保留：`Adapter`、`AdapterManifest`、`ManifestAdapter`、`AdapterHooks`、`HookContext`、`V1AdapterBridge`、`V2Adapter`、`RawMessage`、`Conversation`、`Message`、`MessageRole`、`Provider`、`SourceType`。

只保留：ChatGPT 和 Claude 的核心数据处理逻辑（API 调用、response parsing、content flattening）。这些逻辑迁移到各自的 Plugin 内部。

---

## 1. Decision（架构决策）

### 1.1 核心理念：Plugin = 一个函数对象

Plugin 不是声明式配置，不是 class 继承，不是 manifest + hooks 的组合。Plugin 就是一个对象，实现几个方法：你告诉系统你能处理什么 URL，你从页面里提取内容，你自己决定 UI 怎么注入。

```
                         ┌─────────────┐
                         │   Plugin     │
                         │  Interface   │
                         └──────┬──────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
   ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
   │ ChatGPT       │   │ Claude        │   │ Stack Overflow│
   │ Plugin        │   │ Plugin        │   │ Plugin        │
   │ (API fetch)   │   │ (API fetch)   │   │ (DOM scrape)  │
   └───────────────┘   └───────────────┘   └───────────────┘
```

没有中间层。没有 Fetcher 抽象。没有声明式 manifest。Plugin 直接用 `fetch()` 或读 DOM——怎么获取数据是 Plugin 自己的事。

### 1.2 关键决策清单

| 决策 ID | 决策 | 理由 |
|---------|------|------|
| PLG-001 | Plugin 接口只有 4 个必须方法 | 最小契约，最大自由 |
| PLG-002 | ContentBundle 替代 Conversation 作为唯一数据模型 | 面向任意网站，不假设对话结构 |
| PLG-003 | 不分 ContentType 枚举 | 枚举是预判，Plugin 自己知道自己是什么内容 |
| PLG-004 | Plugin 自己管理 UI 注入 | 每个网站的 DOM 结构不同，通用注入配置没有价值 |
| PLG-005 | core-adapters 包改名为 core-plugins | 语义清晰 |
| PLG-006 | core-schema 大幅简化，只保留 ContentBundle 相关类型 | 删除 Conversation/Message/Provider 等旧概念 |
| PLG-007 | 序列化器基于 ContentBundle，根据 nodes 结构自适应格式化 | 不需要 ContentType switch |

---

## 2. Data Model（数据模型）

### 2.1 ContentBundle — 唯一的数据容器

这是 Plugin 系统的核心：一个通用内容容器。不区分 "conversation"、"thread"、"document"——这些区分交给序列化器根据数据结构自动处理。

```typescript
// packages/core-schema/src/content-bundle.ts

/** 参与者 */
interface Participant {
  id: string;
  /** 显示名称（@username、"User"、"Assistant" 等） */
  name: string;
  /** 可选角色标签，出现在序列化输出中 */
  role?: string;
  /** 平台特定数据 */
  meta?: Record<string, unknown>;
}

/** 内容节点 */
interface ContentNode {
  id: string;
  /** 参与者 ID，引用 participants[] */
  participantId: string;
  /** Markdown 内容 */
  content: string;
  /** 同层级排序 */
  order: number;
  /** 子节点（PR review file comments、SO answer comments 等） */
  children?: ContentNode[];
  /** ISO 时间戳 */
  timestamp?: string;
  /** 节点类型标签（"question"、"answer"、"comment" 等，序列化器可用） */
  type?: string;
  /** 平台特定数据（投票数、采纳标记等） */
  meta?: Record<string, unknown>;
}

/** 来源信息 */
interface SourceMeta {
  /** 平台名（"chatgpt"、"claude"、"stackoverflow" 等） */
  platform: string;
  url?: string;
  extractedAt: string;
  pluginId: string;
  pluginVersion: string;
}

/** 通用内容容器——Plugin 系统的唯一输出类型 */
interface ContentBundle {
  id: string;
  title?: string;
  participants: Participant[];
  nodes: ContentNode[];
  source: SourceMeta;
  /** 平台特定标签（SO tags、GitHub labels 等） */
  tags?: string[];
}
```

### 2.2 和旧模型的对比

| 旧概念 | 新概念 | 变化 |
|--------|--------|------|
| `Conversation` | `ContentBundle` | 更通用，不假设对话结构 |
| `Message` | `ContentNode` | 支持 `children` 嵌套，`type` 标签，`meta` 扩展 |
| `MessageRole` ("user"/"assistant") | `Participant` | 多人、自定义角色 |
| `Provider` ("chatgpt"/"claude") | `SourceMeta.platform` (string) | Open-ended |
| `SourceType` ("extension-current"/"extension-list") | 删除 | 无需区分 |
| `SourceMeta` | `SourceMeta` | 简化，移除 provider enum |
| `BundleMeta` | 序列化器 frontmatter | 不再是 schema 类型 |
| `AdapterInput`/`ExtInput` | `PluginContext` | 见 Plugin 接口 |

### 2.3 ChatGPT 对话在新模型中长什么样

```typescript
const chatgptBundle: ContentBundle = {
  id: "uuid-xxx",
  title: "Help me with React hooks",
  participants: [
    { id: "user", name: "User", role: "user" },
    { id: "assistant", name: "ChatGPT", role: "assistant" },
  ],
  nodes: [
    {
      id: "msg-1",
      participantId: "user",
      content: "How do I use useEffect?",
      order: 0,
      type: "message",
    },
    {
      id: "msg-2",
      participantId: "assistant",
      content: "useEffect is a React Hook that...",
      order: 1,
      type: "message",
    },
  ],
  source: {
    platform: "chatgpt",
    url: "https://chatgpt.com/c/xxx",
    extractedAt: "2026-02-07T10:00:00Z",
    pluginId: "chatgpt",
    pluginVersion: "1.0.0",
  },
};
```

### 2.4 Stack Overflow 问答在新模型中长什么样

```typescript
const soBundle: ContentBundle = {
  id: "uuid-yyy",
  title: "How to properly use useEffect cleanup function?",
  participants: [
    { id: "asker-123", name: "curious_dev", role: "Asker" },
    { id: "answerer-456", name: "react_expert", role: "Contributor" },
    { id: "answerer-789", name: "hooks_guru", role: "Contributor" },
  ],
  nodes: [
    {
      id: "q-1",
      participantId: "asker-123",
      content: "I'm trying to clean up a subscription...\n\n```javascript\nuseEffect(() => {...});\n```",
      order: 0,
      type: "question",
      meta: { score: 45 },
    },
    {
      id: "a-1",
      participantId: "answerer-456",
      content: "The issue is that your dependency array is empty...",
      order: 1,
      type: "answer",
      meta: { score: 128, accepted: true },
    },
    {
      id: "a-2",
      participantId: "answerer-789",
      content: "An alternative approach using useRef...",
      order: 2,
      type: "answer",
      meta: { score: 67 },
    },
  ],
  source: {
    platform: "stackoverflow",
    url: "https://stackoverflow.com/questions/12345678",
    extractedAt: "2026-02-07T10:00:00Z",
    pluginId: "stackoverflow",
    pluginVersion: "1.0.0",
  },
  tags: ["javascript", "react", "hooks", "useeffect"],
};
```

---

## 3. Plugin Interface（Plugin 接口）

### 3.1 核心接口

```typescript
// packages/core-plugins/src/types.ts

/** Plugin 接收的运行时上下文 */
interface PluginContext {
  /** 当前页面 URL */
  url: string;
  /** 当前页面的 Document 对象 */
  document: Document;
}

/** URL 匹配模式 */
interface UrlPattern {
  /** Chrome Extension match patterns（用于 manifest.json content_scripts.matches） */
  hosts: string[];
  /** 运行时 URL 匹配——判断当前页面是否由此 Plugin 处理 */
  match: (url: string) => boolean;
}

/** UI 注入器，Plugin 可选实现 */
interface PluginInjector {
  /** 注入 UI 元素到宿主页面（copy 按钮、list icons 等） */
  inject: (ctx: PluginContext, callbacks: InjectorCallbacks) => void;
  /** 清理已注入的 UI 元素 */
  cleanup: () => void;
}

/** 注入器回调 */
interface InjectorCallbacks {
  /** 渲染 copy 按钮到指定容器 */
  renderCopyButton: (container: HTMLElement) => void;
  /** 渲染 list copy icon 到指定容器 */
  renderListIcon: (container: HTMLElement, itemId: string) => void;
  /** 渲染 batch checkbox 到指定容器 */
  renderBatchCheckbox: (container: HTMLElement, itemId: string) => void;
  /** 移除所有 batch checkbox */
  removeBatchCheckboxes: () => void;
}

/** Plugin 定义 */
interface Plugin {
  /** 唯一标识 */
  id: string;
  /** 版本号 */
  version: string;
  /** 人类可读名称 */
  name: string;

  /** URL 匹配规则 */
  urls: UrlPattern;

  /** 从当前页面提取内容 → ContentBundle */
  extract: (ctx: PluginContext) => Promise<ContentBundle>;

  /**
   * 通过 ID 远程获取内容（list copy icon、batch mode）。
   * 不是所有 Plugin 都需要——只有支持侧边栏列表复制的 Plugin 才实现。
   */
  fetchById?: (id: string) => Promise<ContentBundle>;

  /** UI 注入器——如何在页面上放置 copy 按钮等 */
  injector?: PluginInjector;

  /** 主题色（用于 copy 按钮等 UI 元素） */
  theme?: {
    light: { primary: string; secondary: string; fg: string; secondaryFg: string };
    dark?: { primary: string; secondary: string; fg: string; secondaryFg: string };
  };
}
```

### 3.2 为什么只有 4+2 个方法

| 方法 | 必须 | 作用 |
|------|------|------|
| `urls` | 是 | 声明 URL 匹配规则 |
| `extract()` | 是 | 从页面提取内容 |
| `fetchById()` | 否 | 通过 ID 获取（侧边栏列表复制用） |
| `injector` | 否 | 自定义 UI 注入（不提供则用浮动按钮 fallback） |
| `theme` | 否 | 主题色 |

**没有的东西：**

- 没有 `canHandle()` — `urls.match(url)` 就是 canHandle
- 没有 `parse()` — `extract()` 语义更清晰
- 没有 `supportedInputTypes` — 所有 Plugin 都在 Extension 环境运行
- 没有 `hooks` — Plugin 本身就是代码，不需要生命周期 hook
- 没有 `manifest` — 声明式配置是对自由的约束
- 没有 Fetcher 抽象 — Plugin 自己调 `fetch()`，怎么取数据是 Plugin 的事

### 3.3 Plugin 的自由度

Plugin 接口故意设计得很薄。一个 Plugin 可以：

- 调 REST API（ChatGPT、Claude）
- 调 GraphQL API（未来的 GitHub）
- 直接读 DOM（Stack Overflow、技术文档）
- 混合使用（先 API 后 DOM）
- 使用 cookie session、bearer token、或者不认证
- 做任何 DOM 操作来注入 UI
- 用 MutationObserver 监听 DOM 变化
- Monkey-patch history API 检测路由变化

框架不管 Plugin 内部怎么实现，只要最终调用 `extract()` 时返回一个 `ContentBundle` 就行。

---

## 4. Plugin Registry（注册和发现）

### 4.1 Registry 实现

```typescript
// packages/core-plugins/src/registry.ts

const plugins = new Map<string, Plugin>();

/** 注册 Plugin */
function registerPlugin(plugin: Plugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" already registered, skipping.`);
    return;
  }
  plugins.set(plugin.id, plugin);
}

/** 根据 URL 查找匹配的 Plugin */
function findPlugin(url: string): Plugin | null {
  for (const plugin of plugins.values()) {
    if (plugin.urls.match(url)) return plugin;
  }
  return null;
}

/** 获取所有 Plugin（用于生成 content_scripts.matches） */
function getAllPlugins(): Plugin[] {
  return Array.from(plugins.values());
}

/** 获取所有 host permissions（合并所有 Plugin 的 urls.hosts） */
function getAllHostPermissions(): string[] {
  return Array.from(plugins.values()).flatMap((p) => p.urls.hosts);
}

/** 注册所有内置 Plugin */
function registerBuiltinPlugins(): void {
  // 由各 Plugin 模块提供，在此集中注册
}
```

### 4.2 Extension 集成流程

```
页面加载
  │
  ├─ registerBuiltinPlugins()
  │
  ├─ findPlugin(window.location.href)
  │    │
  │    ├─ 找到 → plugin.injector?.inject()  (注入 UI)
  │    │          用户点击 → plugin.extract() → serialize → clipboard
  │    │
  │    └─ 没找到 → 不做任何事
  │
  └─ URL 变化时（SPA）→ 重新 findPlugin → 切换 Plugin
```

---

## 5. ChatGPT Plugin 示例（完整代码）

以下展示 ChatGPT Plugin 迁移后的样子。核心数据处理逻辑（tree linearization、content flattening）从旧代码直接迁移。

```typescript
// packages/core-plugins/src/plugins/chatgpt/plugin.ts

import type { Plugin, PluginContext } from "../../types";
import type { ContentBundle } from "@ctxport/core-schema";
import { buildLinearConversation } from "./tree-linearizer";
import { flattenMessageContent } from "./content-flattener";
import { stripCitationTokens } from "./text-processor";
import { createChatInjector } from "../shared/chat-injector";
import { generateId } from "../../utils";

const CONVERSATION_PATTERN = /^https?:\/\/(?:chat\.openai\.com|chatgpt\.com)\/c\/([a-zA-Z0-9-]+)/;
const HOST_PATTERN = /^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\//i;

export const chatgptPlugin: Plugin = {
  id: "chatgpt",
  version: "1.0.0",
  name: "ChatGPT",

  urls: {
    hosts: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId) throw new Error("Not a ChatGPT conversation page");

    const token = await getAccessToken();
    const data = await fetchConversation(conversationId, token);
    return parseConversation(data, ctx.url);
  },

  async fetchById(conversationId: string): Promise<ContentBundle> {
    const token = await getAccessToken();
    const data = await fetchConversation(conversationId, token);
    const url = `https://chatgpt.com/c/${conversationId}`;
    return parseConversation(data, url);
  },

  injector: createChatInjector({
    platform: "chatgpt",
    copyButtonSelectors: [
      "main .sticky .flex.items-center.gap-2",
      'main header [class*="flex"][class*="items-center"]',
    ],
    copyButtonPosition: "prepend",
    listItemLinkSelector: 'nav a[href^="/c/"], nav a[href^="/g/"]',
    listItemIdPattern: /\/(?:c|g)\/([a-zA-Z0-9-]+)$/,
    mainContentSelector: "main",
    sidebarSelector: "nav",
  }),

  theme: {
    light: { primary: "#0d0d0d", secondary: "#5d5d5d", fg: "#ffffff", secondaryFg: "#ffffff" },
    dark: { primary: "#0d0d0d", secondary: "#5d5d5d", fg: "#ffffff", secondaryFg: "#ffffff" },
  },
};

// --- 内部实现 ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// Token cache
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - 60_000 > Date.now()) {
    return tokenCache.token;
  }

  const res = await fetch("https://chatgpt.com/api/auth/session", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Session API: ${res.status}`);

  const session = await res.json();
  const token = session.accessToken;
  if (!token) throw new Error("No access token in session");

  tokenCache = {
    token,
    expiresAt: session.expires ? Date.parse(session.expires) : Date.now() + 600_000,
  };
  return token;
}

async function fetchConversation(id: string, token: string): Promise<unknown> {
  const res = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    // Retry with fresh token
    tokenCache = null;
    const freshToken = await getAccessToken();
    const retry = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${freshToken}`,
      },
    });
    if (!retry.ok) throw new Error(`ChatGPT API: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`ChatGPT API: ${res.status}`);
  return res.json();
}

async function parseConversation(raw: unknown, url: string): Promise<ContentBundle> {
  const data = raw as { title?: string; mapping?: Record<string, any>; current_node?: string };
  const mapping = data.mapping ?? {};

  // Linearize tree
  const linear = buildLinearConversation(mapping, data.current_node);
  const nodes = linear.map((id) => mapping[id]).filter(Boolean);

  // Parse messages
  const contentNodes: ContentBundle["nodes"] = [];
  let order = 0;

  for (const node of nodes) {
    if (!node.message?.content) continue;

    const role = node.message.author?.role;
    if (role === "system") continue;
    if (shouldSkipMessage(node)) continue;

    const roleMapping: Record<string, string> = { user: "user", assistant: "assistant", tool: "assistant" };
    const mappedRole = roleMapping[role];
    if (!mappedRole) continue;

    let text = await flattenMessageContent(node.message.content, {});
    text = stripCitationTokens(text);
    if (!text.trim()) continue;

    contentNodes.push({
      id: generateId(),
      participantId: mappedRole,
      content: text,
      order: order++,
      type: "message",
    });
  }

  if (contentNodes.length === 0) throw new Error("No messages found");

  return {
    id: generateId(),
    title: data.title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "ChatGPT", role: "assistant" },
    ],
    nodes: contentNodes,
    source: {
      platform: "chatgpt",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "chatgpt",
      pluginVersion: "1.0.0",
    },
  };
}

function shouldSkipMessage(node: any): boolean {
  const ct = node.message?.content?.content_type;
  if (ct === "thoughts" || ct === "code") return true;

  const meta = node.message?.metadata;
  if (!meta) return false;
  if (meta.is_visually_hidden_from_conversation) return true;
  if (meta.is_redacted) return true;
  if (meta.is_user_system_message) return true;
  if (meta.reasoning_status) return true;
  return false;
}
```

### 5.1 共享 Chat Injector（ChatGPT 和 Claude 共用）

ChatGPT 和 Claude 的 UI 注入模式高度相似（侧边栏列表 + 主内容区 copy 按钮），所以可以共享一个 injector 工厂。这是 "三次重复再抽象" 原则的合理应用——两个 AI 聊天平台结构确实相同。

```typescript
// packages/core-plugins/src/plugins/shared/chat-injector.ts

interface ChatInjectorConfig {
  platform: string;
  copyButtonSelectors: string[];
  copyButtonPosition: "prepend" | "append" | "before" | "after";
  listItemLinkSelector: string;
  listItemIdPattern: RegExp;
  mainContentSelector: string;
  sidebarSelector: string;
}

function createChatInjector(config: ChatInjectorConfig): PluginInjector {
  // 从现有 ManifestInjector 迁移过来
  // 实现 inject() 和 cleanup()
  // 内部使用 MutationObserver 监听 DOM 变化
  // 根据 config 中的 selectors 注入 copy 按钮和 list icons
  return {
    inject(ctx, callbacks) {
      // ... MutationObserver + selector matching + callbacks.renderCopyButton()
    },
    cleanup() {
      // ... disconnect observers, remove injected elements
    },
  };
}
```

**注意**：这不是一个框架级抽象。这只是两个结构相似的 Plugin 共享的工具函数。未来如果有第三个 AI 聊天平台（Gemini）也是同样的结构，它也能用。如果一个平台的结构不同（Stack Overflow），它就不用这个，自己实现 injector。

---

## 6. Stack Overflow Plugin 示例（完整伪代码）

```typescript
// packages/core-plugins/src/plugins/stackoverflow/plugin.ts

import type { Plugin, PluginContext } from "../../types";
import type { ContentBundle, ContentNode, Participant } from "@ctxport/core-schema";
import { generateId } from "../../utils";

const SO_PATTERN = /^https:\/\/(stackoverflow\.com|[^.]+\.stackexchange\.com)\/questions\/(\d+)/;

export const stackoverflowPlugin: Plugin = {
  id: "stackoverflow",
  version: "1.0.0",
  name: "Stack Overflow",

  urls: {
    hosts: ["https://stackoverflow.com/*", "https://*.stackexchange.com/*"],
    match: (url) => SO_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    return parseSOPage(ctx.document, ctx.url);
  },

  // 没有 fetchById — SO 是纯 DOM 抓取，不支持通过 ID 获取
  // 没有 injector — 使用框架默认的浮动 copy 按钮

  theme: {
    light: { primary: "#f48024", secondary: "#fdf7f1", fg: "#ffffff", secondaryFg: "#9a4a00" },
  },
};

function parseSOPage(doc: Document, url: string): ContentBundle {
  const participants: Participant[] = [];
  const nodes: ContentNode[] = [];
  const participantMap = new Map<string, string>();
  let order = 0;

  // 1. 提取问题
  const questionBody = doc.querySelector("#question .js-post-body")?.innerHTML ?? "";
  const questionUser = doc.querySelector("#question .user-details [itemprop='name']")?.textContent ?? "Unknown";
  const questionScore = parseInt(doc.querySelector("#question .js-vote-count")?.textContent ?? "0");

  const questionParticipantId = getParticipantId(questionUser, "Asker", participants, participantMap);
  nodes.push({
    id: generateId(),
    participantId: questionParticipantId,
    content: htmlToMarkdown(questionBody),
    order: order++,
    type: "question",
    meta: { score: questionScore },
  });

  // 2. 提取回答
  const answers = doc.querySelectorAll("#answers .answer");
  for (const answer of answers) {
    const body = answer.querySelector(".js-post-body")?.innerHTML ?? "";
    const user = answer.querySelector(".user-details [itemprop='name']")?.textContent ?? "Unknown";
    const score = parseInt(answer.querySelector(".js-vote-count")?.textContent ?? "0");
    const accepted = answer.classList.contains("accepted-answer");

    const participantId = getParticipantId(user, "Contributor", participants, participantMap);
    nodes.push({
      id: generateId(),
      participantId,
      content: htmlToMarkdown(body),
      order: order++,
      type: "answer",
      meta: { score, accepted },
    });
  }

  // 3. 提取标签
  const tagElements = doc.querySelectorAll(".post-taglist .post-tag");
  const tags = Array.from(tagElements).map((el) => el.textContent ?? "");

  // 4. 提取标题
  const title = doc.querySelector("#question-header h1")?.textContent?.trim();

  return {
    id: generateId(),
    title,
    participants,
    nodes,
    source: {
      platform: "stackoverflow",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "stackoverflow",
      pluginVersion: "1.0.0",
    },
    tags: tags.filter(Boolean),
  };
}

// 辅助函数
function getParticipantId(
  name: string,
  role: string,
  participants: Participant[],
  map: Map<string, string>,
): string {
  const key = name.toLowerCase();
  if (map.has(key)) return map.get(key)!;
  const id = generateId();
  participants.push({ id, name, role });
  map.set(key, id);
  return id;
}

function htmlToMarkdown(html: string): string {
  // 简单的 HTML -> Markdown 转换
  // 处理 <code>, <pre>, <a>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>
  // 可以用 turndown 库，或自写简版
  // ...
  return html; // placeholder
}
```

---

## 7. Serializer（序列化器）

### 7.1 设计原则

序列化器不需要知道内容来自什么平台。它只看 ContentBundle 的结构：

- 有 `participants` → 多参与者格式（`## @username (role)`）
- 只有 user/assistant → 对话格式（`## User` / `## Assistant`）
- `nodes` 有 `children` → 嵌套 heading 层级
- `nodes` 有 `meta.score` → 输出投票数
- `nodes` 有 `meta.accepted` → 标注采纳
- 有 `tags` → 输出标签

### 7.2 序列化函数

```typescript
// packages/core-markdown/src/serializer.ts（修改）

function serializeContentBundle(
  bundle: ContentBundle,
  options?: SerializeOptions,
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options ?? {};

  const isConversation = isConversationBundle(bundle);
  const body = isConversation
    ? serializeAsConversation(bundle, format)
    : serializeAsThread(bundle);

  const tokens = estimateTokens(body);
  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = { ctxport: "v2" };
    meta.source = bundle.source.platform;
    if (bundle.source.url) meta.url = bundle.source.url;
    if (bundle.title) meta.title = bundle.title;
    meta.date = bundle.source.extractedAt;
    meta.nodes = bundle.nodes.length;
    if (bundle.tags?.length) meta.tags = bundle.tags.join(", ");
    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  return {
    markdown: sections.join("\n\n"),
    messageCount: bundle.nodes.length,
    estimatedTokens: tokens,
  };
}

/** 判断是否为对话格式（双参与者 user/assistant） */
function isConversationBundle(bundle: ContentBundle): boolean {
  if (bundle.participants.length !== 2) return false;
  const roles = new Set(bundle.participants.map((p) => p.role));
  return roles.has("user") && roles.has("assistant");
}

/** 对话格式序列化——复用现有逻辑 */
function serializeAsConversation(bundle: ContentBundle, format: BundleFormatType): string {
  // 映射回 Message[] 格式，复用 filterMessages
  const participantMap = new Map(bundle.participants.map((p) => [p.id, p]));
  const messages = bundle.nodes.map((node) => ({
    id: node.id,
    role: participantMap.get(node.participantId)?.role === "user" ? "user" : "assistant",
    contentMarkdown: node.content,
    order: node.order,
  }));
  return filterMessages(messages as any, format).join("\n\n");
}

/** 多参与者 / 线程格式序列化 */
function serializeAsThread(bundle: ContentBundle): string {
  const participantMap = new Map(bundle.participants.map((p) => [p.id, p]));
  const parts: string[] = [];

  for (const node of bundle.nodes) {
    const p = participantMap.get(node.participantId);
    const name = p?.name ?? "Unknown";
    const role = p?.role ? ` (${p.role})` : "";
    const date = node.timestamp ? ` -- ${node.timestamp}` : "";

    // 节点 meta 注解（投票数、采纳标记）
    const annotations: string[] = [];
    if (node.meta?.accepted) annotations.push("Accepted");
    if (typeof node.meta?.score === "number") annotations.push(`Score: ${node.meta.score}`);
    const annoStr = annotations.length ? ` [${annotations.join(", ")}]` : "";

    // 节点类型标签
    const typeLabel = node.type ? capitalize(node.type) : "";
    const heading = typeLabel
      ? `## ${typeLabel}${annoStr} -- @${name}${role}${date}`
      : `## @${name}${role}${date}`;

    parts.push(`${heading}\n\n${node.content}`);

    // 子节点
    if (node.children?.length) {
      for (const child of node.children) {
        const cp = participantMap.get(child.participantId);
        const cn = cp?.name ?? "Unknown";
        const cr = cp?.role ? ` (${cp.role})` : "";
        const cd = child.timestamp ? ` -- ${child.timestamp}` : "";
        parts.push(`### @${cn}${cr}${cd}\n\n${child.content}`);
      }
    }
  }

  return parts.join("\n\n---\n\n");
}
```

### 7.3 输出示例

**ChatGPT 对话：**

```markdown
---
ctxport: v2
source: chatgpt
url: https://chatgpt.com/c/xxx
title: Help me with React hooks
date: 2026-02-07T10:00:00Z
nodes: 2
tokens: ~350
---

## User

How do I use useEffect?

## Assistant

useEffect is a React Hook that...
```

**Stack Overflow 问答：**

```markdown
---
ctxport: v2
source: stackoverflow
url: https://stackoverflow.com/questions/12345678
title: How to properly use useEffect cleanup function?
date: 2026-02-07T10:00:00Z
nodes: 3
tokens: ~1.2k
tags: javascript, react, hooks, useeffect
---

## Question [Score: 45] -- @curious_dev (Asker)

I'm trying to clean up a subscription...

---

## Answer [Accepted, Score: 128] -- @react_expert (Contributor)

The issue is that your dependency array is empty...

---

## Answer [Score: 67] -- @hooks_guru (Contributor)

An alternative approach using useRef...
```

---

## 8. 现有文件处置清单

### 8.1 删除的文件

| 文件 | 理由 |
|------|------|
| `packages/core-adapters/` (整个包) | 被 `packages/core-plugins/` 替代 |
| `packages/core-schema/src/adapter.ts` | `Adapter` 接口被 `Plugin` 替代 |
| `packages/core-schema/src/conversation.ts` | `Conversation` 被 `ContentBundle` 替代 |
| `packages/core-schema/src/message.ts` | `Message` 被 `ContentNode` 替代 |
| `packages/core-schema/src/bundle.ts` | `BundleMeta` 不再是 schema 类型 |

### 8.2 新增的文件

| 文件 | 内容 |
|------|------|
| `packages/core-plugins/src/types.ts` | Plugin, PluginContext, PluginInjector, InjectorCallbacks |
| `packages/core-plugins/src/registry.ts` | registerPlugin, findPlugin, getAllPlugins |
| `packages/core-plugins/src/utils.ts` | generateId 等工具函数 |
| `packages/core-plugins/src/plugins/chatgpt/plugin.ts` | ChatGPT Plugin |
| `packages/core-plugins/src/plugins/chatgpt/tree-linearizer.ts` | 从现有代码迁移 |
| `packages/core-plugins/src/plugins/chatgpt/content-flattener.ts` | 从现有代码迁移 |
| `packages/core-plugins/src/plugins/chatgpt/text-processor.ts` | 从现有代码迁移 |
| `packages/core-plugins/src/plugins/claude/plugin.ts` | Claude Plugin |
| `packages/core-plugins/src/plugins/claude/message-converter.ts` | 从现有代码迁移 |
| `packages/core-plugins/src/plugins/shared/chat-injector.ts` | ChatGPT/Claude 共享的 UI 注入器 |
| `packages/core-plugins/src/index.ts` | 公共 API 导出 |
| `packages/core-schema/src/content-bundle.ts` | ContentBundle, ContentNode, Participant, SourceMeta |

### 8.3 修改的文件

| 文件 | 改动 |
|------|------|
| `packages/core-schema/src/index.ts` | 移除旧 exports，添加 ContentBundle exports |
| `packages/core-schema/src/errors.ts` | 保留，error codes 调整 |
| `packages/core-markdown/src/serializer.ts` | serializeConversation → serializeContentBundle |
| `packages/core-markdown/src/formats.ts` | 新增 serializeAsThread，保留 filterMessages |
| `packages/core-markdown/src/index.ts` | 更新 exports |
| `apps/browser-extension/src/entrypoints/content.tsx` | 用 Plugin registry 替代 adapter registry |
| `apps/browser-extension/src/components/app.tsx` | 用 findPlugin 替代 detectManifest |
| `apps/browser-extension/src/hooks/use-copy-conversation.ts` | 用 plugin.extract() 替代 parseWithAdapters() |
| `apps/browser-extension/wxt.config.ts` | host permissions 从 Plugin registry 生成 |

### 8.4 保留不动的文件

| 文件 | 理由 |
|------|------|
| `packages/core-adapters/src/adapters/chatgpt/shared/types.ts` | 迁移到 chatgpt plugin 内部 |
| `packages/core-adapters/src/adapters/chatgpt/shared/content-flatteners.ts` | 迁移到 chatgpt plugin 内部 |
| `packages/core-adapters/src/adapters/chatgpt/shared/text-processor.ts` | 迁移到 chatgpt plugin 内部 |
| `packages/core-adapters/src/adapters/claude/shared/message-converter.ts` | 迁移到 claude plugin 内部 |
| `packages/core-adapters/src/adapters/claude/shared/types.ts` | 迁移到 claude plugin 内部 |

注："保留不动" 意思是代码逻辑保留，物理文件位置迁移到新 package。

### 8.5 上轮未完成的文件处置

| 文件 | 状态 | 处置 |
|------|------|------|
| `packages/core-adapters/src/extension-site-types.ts` | 已标记删除 (git status: D) | 确认删除 |
| `packages/core-adapters/src/extension-sites.ts` | 已标记删除 (git status: D) | 确认删除 |

---

## 9. Extension 集成

### 9.1 Content Script 入口

```typescript
// apps/browser-extension/src/entrypoints/content.tsx（修改后）

import { registerBuiltinPlugins, getAllHostPermissions } from "@ctxport/core-plugins";

export default defineContentScript({
  matches: getAllHostPermissions(),  // 从 Plugin registry 动态生成
  cssInjectionMode: "ui",

  async main(ctx) {
    registerBuiltinPlugins();

    // Shadow Root UI（toast、batch bar 等 overlay 组件）
    const ui = await createShadowRootUi(ctx, {
      // ... 和现有代码基本一致
      onMount(container) {
        // SPA URL change detection（和现有代码一致）
        // Mount React App
      },
    });
    ui.mount();
  },
});
```

### 9.2 App 组件

```typescript
// apps/browser-extension/src/components/app.tsx（修改后）

import { findPlugin } from "@ctxport/core-plugins";

export default function App() {
  const url = useExtensionUrl();
  const plugin = findPlugin(url);

  useEffect(() => {
    if (!plugin?.injector) return;

    plugin.injector.inject(
      { url, document },
      {
        renderCopyButton: (container) => {
          const root = createRoot(container);
          root.render(<CopyButton plugin={plugin} onToast={showToast} />);
        },
        renderListIcon: (container, itemId) => {
          const root = createRoot(container);
          root.render(<ListCopyIcon plugin={plugin} itemId={itemId} onToast={showToast} />);
        },
        renderBatchCheckbox: (container, itemId) => { /* ... */ },
        removeBatchCheckboxes: () => { /* ... */ },
      },
    );

    return () => plugin.injector?.cleanup();
  }, [url, plugin]);

  return (
    <BatchProvider>
      <Toast data={toast} onDismiss={dismissToast} />
      <BatchBar onToast={showToast} />
      {plugin && !plugin.injector && <FloatingCopyButton plugin={plugin} onToast={showToast} />}
    </BatchProvider>
  );
}
```

### 9.3 Copy Hook

```typescript
// apps/browser-extension/src/hooks/use-copy.ts（替代 use-copy-conversation.ts）

import { findPlugin } from "@ctxport/core-plugins";
import { serializeContentBundle } from "@ctxport/core-markdown";

export function useCopy() {
  const copy = useCallback(async (format = "full") => {
    const plugin = findPlugin(window.location.href);
    if (!plugin) throw new Error("No plugin for this page");

    const bundle = await plugin.extract({ url: window.location.href, document });
    const result = serializeContentBundle(bundle, { format });
    await writeToClipboard(result.markdown);

    return { messageCount: result.messageCount, estimatedTokens: result.estimatedTokens };
  }, []);

  return { copy, /* state management */ };
}
```

---

## 10. Trade-offs（取舍分析）

### 10.1 选择了什么

| 选择 | 理由 |
|------|------|
| 从零设计，不保留兼容层 | 产品没发布，没有兼容负担。干净的架构比打补丁更好维护 |
| Plugin 接口极简（4 个方法） | 最小契约，最大自由。Plugin 作者不需要学习框架 |
| 不区分 ContentType | 序列化器可以根据数据结构自动推断，不需要额外枚举 |
| Plugin 自己管理 UI 注入 | 每个网站的 DOM 结构不同，通用注入框架没有价值 |
| 共享 chat-injector 工具函数 | AI 聊天平台结构相似，共享是合理的。但它是工具函数，不是框架 |
| core-adapters 改名为 core-plugins | 语义清晰，一次到位 |

### 10.2 放弃了什么

| 放弃 | 理由 |
|------|------|
| 声明式 Manifest 系统 | 对异构平台没有价值。代码比配置更灵活 |
| Fetcher 抽象 | Plugin 直接用 fetch()，三次重复再抽象 |
| Hooks 生命周期 | Plugin 本身就是代码，不需要 hook 注入点 |
| V1AdapterBridge 兼容层 | 没有用户，不需要兼容 |
| ContentType 枚举 | 预判未来需求是浪费。序列化器自动推断 |
| Zod 运行时验证（ContentBundle） | ContentBundle 是内部数据结构，TypeScript 类型检查足够 |

### 10.3 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Plugin 接口太薄，未来需要扩展 | 中 | 低 | 接口是 additive 的，加字段不破坏现有 Plugin |
| 不做 Zod 验证导致运行时数据错误 | 低 | 低 | Plugin 内部做自己的验证，框架不强制 |
| chat-injector 不够通用，新 AI 平台不能用 | 低 | 低 | 新 AI 平台可以自己实现 injector |
| 重构工作量大 | 确定 | 中 | 代码量实际不大（核心逻辑是迁移不是重写），且无兼容负担 |
| 序列化器的 isConversationBundle 启发式判断出错 | 低 | 低 | 可以在 ContentBundle 上加可选的 `hint` 字段 |

---

## 11. 实施路线

### Phase 1：核心类型 + Plugin 框架

1. 新建 `packages/core-plugins/` 包
2. 定义 `Plugin`、`PluginContext`、`ContentBundle` 等类型
3. 实现 Plugin registry
4. 修改 `packages/core-schema/`：删除旧类型，添加 `ContentBundle`

### Phase 2：迁移 ChatGPT + Claude Plugin

1. 将 ChatGPT adapter 逻辑迁移到 `core-plugins/src/plugins/chatgpt/`
2. 将 Claude adapter 逻辑迁移到 `core-plugins/src/plugins/claude/`
3. 提取共享的 `chat-injector`
4. 删除 `packages/core-adapters/`

### Phase 3：序列化器适配

1. 修改 `core-markdown` 的 serializer 支持 `ContentBundle`
2. 对话格式复用现有 `filterMessages` 逻辑
3. 新增线程格式序列化

### Phase 4：Extension 集成

1. 修改 content script 入口用 Plugin registry
2. 修改 App 组件用 `findPlugin`
3. 修改 copy hook 用 `plugin.extract()`
4. 端到端测试 ChatGPT + Claude

### Phase 5：第一个非聊天 Plugin（Stack Overflow）

1. 实现 SO Plugin（DOM 抓取）
2. 验证线程格式序列化输出
3. 端到端测试

### 不做的事

- 不做 Fetcher 抽象
- 不做 ContentType 枚举
- 不做 Zod 运行时验证 ContentBundle
- 不做 OAuth
- 不做 plugin marketplace / 动态加载
- 不做 V2Manifest 声明式配置
- 不做 Gmail / Slack / Notion（至少 6 个月后）

---

## 12. Package 结构

```
packages/
├── core-schema/
│   └── src/
│       ├── content-bundle.ts   ← ContentBundle, ContentNode, Participant, SourceMeta
│       ├── errors.ts           ← 保留
│       └── index.ts            ← 更新 exports
│
├── core-plugins/               ← 新包，替代 core-adapters
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   └── src/
│       ├── types.ts            ← Plugin, PluginContext, PluginInjector
│       ├── registry.ts         ← registerPlugin, findPlugin
│       ├── utils.ts            ← generateId
│       ├── plugins/
│       │   ├── chatgpt/
│       │   │   ├── plugin.ts
│       │   │   ├── tree-linearizer.ts
│       │   │   ├── content-flattener.ts
│       │   │   ├── text-processor.ts
│       │   │   └── types.ts
│       │   ├── claude/
│       │   │   ├── plugin.ts
│       │   │   ├── message-converter.ts
│       │   │   └── types.ts
│       │   └── shared/
│       │       └── chat-injector.ts
│       └── index.ts
│
├── core-markdown/
│   └── src/
│       ├── serializer.ts       ← serializeContentBundle (替代 serializeConversation)
│       ├── formats.ts          ← 保留 filterMessages + 新增 serializeAsThread
│       ├── token-estimator.ts  ← 保留
│       └── index.ts            ← 更新 exports
│
└── (core-adapters/)            ← 删除整个包
```

---

> *"The cheapest, fastest, and most reliable components of a computer system are those that aren't there."*
> -- Gordon Bell
>
> Plugin 系统的设计哲学：删除所有不需要的层。没有 Manifest，没有 Hooks，没有 Fetcher，没有 Bridge，没有 ContentType。Plugin 就是一个对象，实现 `extract()` 返回 `ContentBundle`。其他的一切都是 Plugin 内部的事。
>
> 约束：一个新 Plugin 的核心代码不应超过 200 行。如果超过了，问题在于 Plugin 处理的平台数据太复杂——不在于框架缺少什么抽象。

---

*文档维护者：CTO（Werner Vogels 视角）*
*最后更新：2026-02-07*
