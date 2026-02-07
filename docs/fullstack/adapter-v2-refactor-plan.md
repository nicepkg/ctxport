# Adapter V2 重构实现计划

> 版本：v1.0 | 日期：2026-02-07
> 角色：全栈开发（DHH 思维模型）
> 输入：CTO 架构设计 + 产品需求分析 + 现有代码审查

---

## 0. 审查结论

### 对 CTO 架构方案的评价

**可以简化的部分：**

1. **ContentType 枚举过早** — CTO 定义了 `conversation | thread | document | code-review | email` 五种类型。但 Phase 1 只需要 `conversation` 和 `thread`。`code-review` 实际上是 `thread` 的特化（按文件分组的讨论），`email` 也是 `thread` 的变体，`document` 暂无目标平台。**建议先只定义 `conversation` 和 `thread`**，其他类型等有具体需求时再加——加 enum 值是 additive change，随时可以做。

2. **Fetcher 抽象是 YAGNI** — CTO 定义了 `RestFetcher`、`GraphQLFetcher`、`DomFetcher` 三种 Fetcher 配置 + 对应的执行器。但看现有代码，V1 的 `ManifestAdapter` 已经内置了完整的 REST fetch 逻辑。Phase 1 的 Stack Overflow 用 DOM 抓取（公开页面，不需要 API），GitHub Issues 用 REST API（和 V1 用法一致）。**建议不要抽 Fetcher 层**——V2Adapter 直接在 `extract()` 里写 fetch 逻辑，50 行搞定。等到有 3 个以上 adapter 共享相同 fetch 模式时再抽象。

3. **V2 Manifest Schema 过度设计** — CTO 设计了一个完整的 V2Manifest，包含通用化的 `parsing.participants`、`parsing.nodes` 等声明式配置。但 Stack Overflow 和 GitHub Issues 的数据结构差异太大，声明式配置反而增加复杂度。**建议 Phase 1 的新平台 adapter 直接实现 `V2Adapter` 接口**（纯代码），不走 manifest 声明式路线。V2Manifest 等到有 3 个以上结构相似的非聊天平台时再考虑。

4. **Auth V2 的 `bearer-from-storage` 和 `oauth` 是预留** — 同意 CTO 的决策不实现 OAuth，但 `bearer-from-storage` 也可以推迟。GitHub Issues 公开仓库用 cookie-session 即可，Stack Overflow 是完全公开的。

5. **V2Hooks 过度设计** — `buildParticipants`、`afterParse` 等 hooks 在代码式 adapter 中不需要，因为 adapter 本身就是代码，不需要 hooks 来注入逻辑。

**必须保留的部分：**

1. **ContentBundle + ContentNode + Participant 数据模型** — 这是 V2 的核心价值。模型设计合理，`children` 可选字段不增加 conversation 场景的复杂度。
2. **V2Adapter 接口** — `canHandle(url) + extract(input) -> ContentBundle` 简洁明确。
3. **V1AdapterBridge** — 零改动复用 ChatGPT/Claude，这是向后兼容的关键。
4. **`conversationToContentBundle()` 转换函数** — 简单的纯函数映射，必须有。

### 对产品需求的评价

**合理且可执行的部分：**
- Phase 1 做 Stack Overflow + GitHub Issues 是正确的（公开数据 + 开发者高频场景）
- 过滤 bot 评论的需求实际（GitHub CI bots, Dependabot）
- Markdown 输出格式保留参与者信息

**过于超前的部分：**
- Gmail、Slack、Notion 至少 6 个月后再考虑。DOM 抓取复杂度 + 隐私问题不是当前阶段应该投入的
- "多页面打包"、"跨频道汇总"、"选中内容复制" 都是 V3 级别的功能
- 粒度选择（"全部/高票/仅采纳"）可以做，但 Phase 1 只需要 "全部" 一种

---

## 1. 简化后的 V2 架构

### 和 CTO 方案的核心区别

| CTO 方案 | DHH 简化方案 | 理由 |
|----------|-------------|------|
| 5 种 ContentType | 先做 2 种：`conversation` + `thread` | 其他类型等有需求再加 |
| Fetcher 抽象层（3 种执行器） | 不抽，adapter 直接写 fetch | 三次重复再抽象 |
| V2Manifest 声明式配置 | 纯代码 V2Adapter | 声明式对异构平台没有优势 |
| V2Hooks（7 个 hook 点） | 不需要——代码式 adapter 自带灵活性 | Hooks 是给声明式 manifest 的补偿 |
| Auth V2（5 种认证方式） | 保留类型定义，只实现 `cookie-session` + `none` | 按需添加 |

### 最终要做的事

1. 在 core-schema 新增 `ContentBundle` 相关类型（~100 行）
2. 在 core-adapters 新增 `V2Adapter` 接口 + `V1AdapterBridge`（~80 行）
3. 扩展 registry 支持 V2 adapter（~40 行改动）
4. 在 core-markdown 新增 `serializeContentBundle()` + `serializeThread()`（~120 行）
5. 实现 Stack Overflow adapter（~150 行）
6. 实现 GitHub Issues adapter（~150 行）
7. browser extension 接入 V2 流程（~50 行改动）

**总计新增代码量：~690 行**。一个人 2-3 天可以完成。

---

## 2. 分阶段实施计划

### Phase 1：核心类型 + 兼容层（可独立交付和测试）

**目标**：引入 ContentBundle 类型和 V1 -> V2 桥接，现有功能零影响。

#### 1a. core-schema 新增类型

**新增文件：**
- `packages/core-schema/src/content-bundle.ts`

**修改文件：**
- `packages/core-schema/src/index.ts`（新增 export）

**具体内容：**

```typescript
// packages/core-schema/src/content-bundle.ts（~80 行）

import { z } from "zod";

export const ContentType = z.enum(["conversation", "thread"]);
export type ContentType = z.infer<typeof ContentType>;

export const Participant = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
export type Participant = z.infer<typeof Participant>;

export const ContentNode = z.object({
  id: z.string(),
  participantId: z.string(),
  contentMarkdown: z.string(),
  order: z.number().int().nonnegative(),
  children: z.lazy(() => z.array(ContentNode)).optional(),
  createdAt: z.string().optional(),
  nodeType: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export type ContentNode = z.infer<typeof ContentNode>;

export const ContentSourceMeta = z.object({
  platform: z.string(),
  url: z.string().url().optional(),
  parsedAt: z.string().datetime().optional(),
  adapterId: z.string().optional(),
  adapterVersion: z.string().optional(),
});
export type ContentSourceMeta = z.infer<typeof ContentSourceMeta>;

export const ContentBundle = z.object({
  id: z.string(),
  contentType: ContentType,
  title: z.string().optional(),
  participants: z.array(Participant),
  nodes: z.array(ContentNode),
  sourceMeta: ContentSourceMeta.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ContentBundle = z.infer<typeof ContentBundle>;
```

**新增文件：**
- `packages/core-schema/src/compat.ts`

```typescript
// packages/core-schema/src/compat.ts（~40 行）

import type { Conversation } from "./conversation";
import type { ContentBundle, Participant, ContentNode } from "./content-bundle";

export function conversationToContentBundle(conv: Conversation): ContentBundle {
  const participants: Participant[] = [
    { id: "user", displayName: "User", role: "user" },
    { id: "assistant", displayName: "Assistant", role: "assistant" },
  ];

  const nodes: ContentNode[] = conv.messages.map((msg) => ({
    id: msg.id,
    participantId: msg.role === "user" ? "user" : "assistant",
    contentMarkdown: msg.contentMarkdown,
    order: msg.order,
    createdAt: msg.createdAt,
  }));

  return {
    id: conv.id,
    contentType: "conversation",
    title: conv.title,
    participants,
    nodes,
    sourceMeta: conv.sourceMeta
      ? {
          platform: conv.sourceMeta.provider,
          url: conv.sourceMeta.url,
          parsedAt: conv.sourceMeta.parsedAt,
          adapterId: conv.sourceMeta.adapterId,
          adapterVersion: conv.sourceMeta.adapterVersion,
        }
      : undefined,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}
```

**`index.ts` 改动（+4 行）：**

```typescript
// 新增
export { ContentType, Participant, ContentNode, ContentSourceMeta, ContentBundle } from "./content-bundle";
export { conversationToContentBundle } from "./compat";
```

**改动量：** ~120 行新增，4 行修改
**不动的文件：** `message.ts`, `conversation.ts`, `adapter.ts`, `bundle.ts`, `errors.ts` 全部不动

#### 1b. core-adapters 新增 V2Adapter 接口 + Bridge

**新增文件：**
- `packages/core-adapters/src/v2/types.ts`

```typescript
// packages/core-adapters/src/v2/types.ts（~25 行）

import type { ContentBundle } from "@ctxport/core-schema";

export interface V2AdapterInput {
  type: "ext";
  url: string;
  document: Document;
}

export interface V2Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  canHandle(url: string): boolean;
  extract(input: V2AdapterInput): Promise<ContentBundle>;
}
```

**新增文件：**
- `packages/core-adapters/src/v2/bridge.ts`

```typescript
// packages/core-adapters/src/v2/bridge.ts（~35 行）

import type { Adapter } from "@ctxport/core-schema";
import { conversationToContentBundle } from "@ctxport/core-schema";
import type { ContentBundle } from "@ctxport/core-schema";
import type { V2Adapter, V2AdapterInput } from "./types";

export class V1AdapterBridge implements V2Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;

  constructor(private readonly v1Adapter: Adapter) {
    this.id = v1Adapter.id;
    this.version = v1Adapter.version;
    this.name = v1Adapter.name;
  }

  canHandle(url: string): boolean {
    return this.v1Adapter.canHandle({ type: "ext", url, document } as any);
  }

  async extract(input: V2AdapterInput): Promise<ContentBundle> {
    const conversation = await this.v1Adapter.parse({
      type: "ext",
      url: input.url,
      document: input.document,
    });
    return conversationToContentBundle(conversation);
  }
}
```

**新增文件：**
- `packages/core-adapters/src/v2/index.ts`

```typescript
export type { V2Adapter, V2AdapterInput } from "./types";
export { V1AdapterBridge } from "./bridge";
```

**修改文件：**
- `packages/core-adapters/src/registry.ts` — 扩展 registry 支持 V2

registry 的改动是**添加一组新函数**，不改动现有函数：

```typescript
// 在 registry.ts 末尾新增（~40 行）

import type { V2Adapter, V2AdapterInput } from "./v2/types";
import type { ContentBundle } from "@ctxport/core-schema";
import { V1AdapterBridge } from "./v2/bridge";

const v2Adapters = new Map<string, V2Adapter>();

export function registerV2Adapter(adapter: V2Adapter): void {
  v2Adapters.set(adapter.id, adapter);
}

export function getV2Adapters(): V2Adapter[] {
  return Array.from(v2Adapters.values());
}

export function getAllV2Adapters(): V2Adapter[] {
  // V2 native adapters + V1 adapters wrapped as V2
  const bridged = getAdapters().map((a) => new V1AdapterBridge(a));
  return [...Array.from(v2Adapters.values()), ...bridged];
}

export interface ExtractResult {
  bundle: ContentBundle;
  adapterId: string;
  adapterVersion: string;
}

export async function extractWithAdapters(
  input: V2AdapterInput,
): Promise<ExtractResult> {
  const all = getAllV2Adapters();
  const compatible = all.filter((a) => {
    try { return a.canHandle(input.url); } catch { return false; }
  });

  if (compatible.length === 0) {
    throw createAppError("E-PARSE-001", `No adapter found for URL: ${input.url}`);
  }

  for (const adapter of compatible) {
    try {
      const bundle = await adapter.extract(input);
      return { bundle, adapterId: adapter.id, adapterVersion: adapter.version };
    } catch (error) {
      // Try next adapter
    }
  }

  throw createAppError("E-PARSE-001", "All compatible adapters failed");
}
```

**修改文件：**
- `packages/core-adapters/src/index.ts` — 新增 V2 exports

```typescript
// 新增 export
export type { V2Adapter, V2AdapterInput } from "./v2/types";
export { V1AdapterBridge } from "./v2/bridge";
export { registerV2Adapter, extractWithAdapters } from "./registry";
export type { ExtractResult } from "./registry";
```

**修改文件：**
- `packages/core-adapters/package.json` — 新增 sub-path export

```json
"./v2": {
  "types": "./src/v2/index.ts",
  "development": "./src/v2/index.ts",
  "import": "./src/v2/index.ts",
  "default": "./src/v2/index.ts"
}
```

**改动量：** ~100 行新增，~15 行修改
**不动的文件：** `base.ts`, `manifest/*`, `adapters/chatgpt/*`, `adapters/claude/*` 全部不动

#### 1c. 验收标准

- [ ] `pnpm build` 全部通过
- [ ] `pnpm typecheck` 全部通过
- [ ] 现有 ChatGPT/Claude adapter 功能完全不受影响
- [ ] 编写单元测试：`conversationToContentBundle()` 正确转换
- [ ] 编写单元测试：`V1AdapterBridge` 包装后 `extract()` 返回正确的 `ContentBundle`
- [ ] 编写单元测试：`extractWithAdapters()` 能找到并使用 V1 桥接的 adapter

---

### Phase 2：ContentBundle 序列化（可独立交付和测试）

**目标**：core-markdown 支持序列化 ContentBundle，conversation 类型复用现有逻辑。

#### 2a. core-markdown 新增序列化函数

**修改文件：**
- `packages/core-markdown/src/serializer.ts`
- `packages/core-markdown/src/formats.ts`
- `packages/core-markdown/src/index.ts`

**具体内容：**

`serializer.ts` 新增 `serializeContentBundle()` 函数（~60 行）：

```typescript
import type { ContentBundle, ContentNode, Participant } from "@ctxport/core-schema";

export function serializeContentBundle(
  bundle: ContentBundle,
  options: SerializeOptions = {},
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options;

  let body: string;

  switch (bundle.contentType) {
    case "conversation":
      body = serializeConversationNodes(bundle, format);
      break;
    case "thread":
      body = serializeThreadNodes(bundle);
      break;
    default:
      body = serializeFallbackNodes(bundle);
  }

  const tokens = estimateTokens(body);
  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = { ctxport: "v2" };
    if (bundle.sourceMeta?.platform) meta.source = bundle.sourceMeta.platform;
    if (bundle.sourceMeta?.url) meta.url = bundle.sourceMeta.url;
    if (bundle.title) meta.title = bundle.title;
    meta.date = bundle.createdAt ?? new Date().toISOString();
    meta.content_type = bundle.contentType;
    meta.nodes = bundle.nodes.length;
    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  return {
    markdown: sections.join("\n\n"),
    messageCount: bundle.nodes.length,
    estimatedTokens: tokens,
  };
}
```

`formats.ts` 新增线程序列化函数（~50 行）：

```typescript
function serializeConversationNodes(bundle: ContentBundle, format: BundleFormatType): string {
  // 将 ContentNode + Participant 映射回 Message 格式，复用现有 filterMessages
  const participantMap = new Map(bundle.participants.map(p => [p.id, p]));
  const messages: Message[] = bundle.nodes.map(node => ({
    id: node.id,
    role: (participantMap.get(node.participantId)?.role === "user" ? "user" : "assistant") as MessageRole,
    contentMarkdown: node.contentMarkdown,
    order: node.order,
  }));
  return filterMessages(messages, format).join("\n\n");
}

function serializeThreadNodes(bundle: ContentBundle): string {
  const participantMap = new Map(bundle.participants.map(p => [p.id, p]));
  const parts: string[] = [];

  for (const node of bundle.nodes) {
    const participant = participantMap.get(node.participantId);
    const name = participant?.displayName ?? "Unknown";
    const role = participant?.role ? ` (${participant.role})` : "";
    const date = node.createdAt ? ` — ${node.createdAt}` : "";
    parts.push(`## @${name}${role}${date}\n\n${node.contentMarkdown}`);

    if (node.children?.length) {
      for (const child of node.children) {
        const cp = participantMap.get(child.participantId);
        const cn = cp?.displayName ?? "Unknown";
        const cr = cp?.role ? ` (${cp.role})` : "";
        const cd = child.createdAt ? ` — ${child.createdAt}` : "";
        parts.push(`### @${cn}${cr}${cd}\n\n${child.contentMarkdown}`);
      }
    }
  }

  return parts.join("\n\n");
}

function serializeFallbackNodes(bundle: ContentBundle): string {
  return bundle.nodes
    .map(node => `## ${node.nodeType ?? "Content"}\n\n${node.contentMarkdown}`)
    .join("\n\n");
}
```

`index.ts` 新增 export：

```typescript
export { serializeContentBundle } from "./serializer";
```

**改动量：** ~120 行新增，2 行修改
**不动的：** 现有的 `serializeConversation()`、`serializeBundle()`、`filterMessages()` 全部不动

#### 2b. 验收标准

- [ ] `serializeConversation()` 现有行为完全不变（现有测试通过）
- [ ] `serializeContentBundle()` 对 conversation 类型输出与 `serializeConversation()` 等效
- [ ] `serializeContentBundle()` 对 thread 类型输出包含 `@username (role)` 格式的 heading
- [ ] 编写单元测试覆盖两种 contentType 的序列化

---

### Phase 3：Stack Overflow Adapter（第一个非聊天平台）

**目标**：端到端验证 V2 架构：SO 页面 -> ContentBundle -> Markdown -> Clipboard

#### 3a. Stack Overflow Adapter 实现

**新增文件：**
- `packages/core-adapters/src/adapters/stackoverflow/adapter.ts`
- `packages/core-adapters/src/adapters/stackoverflow/dom-parser.ts`

Stack Overflow 选择 **DOM 抓取** 策略：
- 公开数据，不需要认证
- DOM 结构稳定（传统服务端渲染，非 SPA）
- 避免 API 速率限制

```typescript
// adapter.ts（~80 行）

import type { V2Adapter, V2AdapterInput } from "../../v2/types";
import type { ContentBundle } from "@ctxport/core-schema";
import { parseSOPage } from "./dom-parser";

const SO_URL_PATTERN = /^https:\/\/(stackoverflow\.com|[^.]+\.stackexchange\.com)\/questions\/(\d+)/;

export const stackoverflowAdapter: V2Adapter = {
  id: "stackoverflow",
  version: "1.0.0",
  name: "Stack Overflow",

  canHandle(url: string): boolean {
    return SO_URL_PATTERN.test(url);
  },

  async extract(input: V2AdapterInput): Promise<ContentBundle> {
    return parseSOPage(input.document, input.url);
  },
};
```

```typescript
// dom-parser.ts（~100 行）
// 从 DOM 提取问题、回答、参与者
// 选择器基于 SO 的稳定 DOM 结构：
// - 问题：#question .js-post-body
// - 回答：#answers .answer
// - 用户名：.user-details [itemprop="name"]
// - 投票数：.js-vote-count
// - 采纳标记：.accepted-answer
// - 标签：.post-taglist .post-tag
```

**修改文件：**
- `packages/core-adapters/src/adapters/index.ts` — 注册 SO adapter

```typescript
import { stackoverflowAdapter } from "./stackoverflow/adapter";

// 在 builtinManifestEntries 之外，新增 V2 adapter 列表
export const builtinV2Adapters: V2Adapter[] = [
  stackoverflowAdapter,
];
```

- `packages/core-adapters/src/index.ts` — 注册 V2 adapters

```typescript
export function registerBuiltinAdapters(): void {
  for (const entry of builtinManifestEntries) {
    if (!_getAdapter(entry.manifest.id)) {
      registerManifestAdapter(entry);
    }
  }
  // 注册 V2 adapters
  for (const adapter of builtinV2Adapters) {
    registerV2Adapter(adapter);
  }
}
```

**改动量：** ~180 行新增，~10 行修改

#### 3b. Browser Extension 接入

**修改文件：**
- `apps/browser-extension/src/hooks/use-copy-conversation.ts`

修改 `copy` 函数，优先尝试 `extractWithAdapters()`（V2），自动回退 `parseWithAdapters()`（V1）：

```typescript
// 改动核心逻辑（~20 行改动）

import { extractWithAdapters } from "@ctxport/core-adapters";
import { serializeContentBundle } from "@ctxport/core-markdown";

const copy = useCallback(async (format: BundleFormatType = "full") => {
  setState("loading");
  try {
    ensureAdapters();
    // V2 路径：extractWithAdapters 已包含 V1 桥接
    const { bundle } = await extractWithAdapters({
      type: "ext",
      document: document,
      url: window.location.href,
    });

    const serialized = serializeContentBundle(bundle, { format });
    await writeToClipboard(serialized.markdown);
    // ...
  } catch (err) { /* ... */ }
}, []);
```

**修改文件：**
- `apps/browser-extension/wxt.config.ts` — 添加 SO host permissions

**改动量：** ~30 行修改

#### 3c. Stack Overflow UI 注入

Stack Overflow 不使用 `ManifestInjector`（因为没有侧边栏列表），需要一个简单的 copy button 注入。

**选项 A**：直接在 `App` 组件中根据当前 URL 判断平台，显示不同的 UI。
**选项 B**：新增一个轻量的 SO-specific injector。

**推荐选项 A** — 最小改动，在 `App` 组件中检测 SO URL，渲染一个浮动 copy button。SO 页面结构简单，不需要 MutationObserver。

**改动量：** ~40 行

#### 3d. 验收标准

- [ ] 在 Stack Overflow 问题页面点击 copy 按钮，剪贴板中得到正确的 Markdown
- [ ] Markdown 包含：问题、所有回答（含投票数和采纳标记）、标签
- [ ] 机器人 / 低质量回答（负票数）不被过滤（Phase 1 不做过滤，先出全量）
- [ ] ChatGPT / Claude 原有功能完全不受影响
- [ ] 现有测试全部通过 + 新增 SO DOM parser 的单元测试

---

### Phase 4：GitHub Issues Adapter

**目标**：第二个非聊天平台，验证 V2 架构的扩展性。

#### 4a. GitHub Issues Adapter 实现

**新增文件：**
- `packages/core-adapters/src/adapters/github-issue/adapter.ts`
- `packages/core-adapters/src/adapters/github-issue/dom-parser.ts`

GitHub Issues 也选择 **DOM 抓取** 策略（Phase 1）：
- 公开仓库不需要 API token
- 避免 PAT 配置门槛（开箱即用）
- Issue 页面的评论已经在 DOM 中

> 注：未来如果需要私有仓库支持，可以切换到 REST API + cookie-session 模式，adapter 接口不变。

```typescript
// adapter.ts（~50 行）

const GH_ISSUE_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;

export const githubIssueAdapter: V2Adapter = {
  id: "github-issue",
  version: "1.0.0",
  name: "GitHub Issue",

  canHandle(url: string): boolean {
    return GH_ISSUE_PATTERN.test(url);
  },

  async extract(input: V2AdapterInput): Promise<ContentBundle> {
    return parseGithubIssuePage(input.document, input.url);
  },
};
```

```typescript
// dom-parser.ts（~120 行)
// GitHub Issue 的 DOM 结构：
// - 标题：.js-issue-title / bdi
// - Issue 正文：.js-comment-body (第一个)
// - 评论列表：.js-discussion .timeline-comment
// - 用户名：.author
// - 时间：relative-time[datetime]
// - bot 检测：.Label--bot 或 [data-testid="author-association-badge"] 含 "bot"
```

**修改文件：**
- `packages/core-adapters/src/adapters/index.ts` — 注册 GitHub Issue adapter
- WXT config — 添加 github.com host permissions

**改动量：** ~170 行新增，~5 行修改

#### 4b. GitHub Issue UI 注入

与 SO 类似，在 Issue 页面标题区域注入一个浮动 copy button。

**改动量：** ~30 行

#### 4c. 验收标准

- [ ] 在 GitHub Issue 页面点击 copy 按钮，剪贴板中得到正确的 Markdown
- [ ] Markdown 包含：Issue 标题、正文、所有人类评论（@username + role）
- [ ] bot 评论默认过滤，底部注明过滤数量
- [ ] ChatGPT / Claude / Stack Overflow 功能不受影响
- [ ] 新增 GitHub Issue DOM parser 的单元测试

---

## 3. 文件影响汇总

### 新增文件（9 个）

| 文件 | Phase | 行数 |
|------|-------|------|
| `packages/core-schema/src/content-bundle.ts` | 1 | ~80 |
| `packages/core-schema/src/compat.ts` | 1 | ~40 |
| `packages/core-adapters/src/v2/types.ts` | 1 | ~25 |
| `packages/core-adapters/src/v2/bridge.ts` | 1 | ~35 |
| `packages/core-adapters/src/v2/index.ts` | 1 | ~5 |
| `packages/core-adapters/src/adapters/stackoverflow/adapter.ts` | 3 | ~80 |
| `packages/core-adapters/src/adapters/stackoverflow/dom-parser.ts` | 3 | ~100 |
| `packages/core-adapters/src/adapters/github-issue/adapter.ts` | 4 | ~50 |
| `packages/core-adapters/src/adapters/github-issue/dom-parser.ts` | 4 | ~120 |

### 修改文件（7 个）

| 文件 | Phase | 改动 |
|------|-------|------|
| `packages/core-schema/src/index.ts` | 1 | +4 行 export |
| `packages/core-adapters/src/registry.ts` | 1 | +40 行新函数 |
| `packages/core-adapters/src/index.ts` | 1+3 | +10 行 export |
| `packages/core-adapters/src/adapters/index.ts` | 3+4 | +5 行注册 |
| `packages/core-adapters/package.json` | 1 | +6 行 export entry |
| `packages/core-markdown/src/serializer.ts` | 2 | +60 行新函数 |
| `packages/core-markdown/src/formats.ts` | 2 | +50 行新函数 |
| `packages/core-markdown/src/index.ts` | 2 | +1 行 export |
| `apps/browser-extension/src/hooks/use-copy-conversation.ts` | 3 | ~20 行重构 |

### 完全不动的文件

- `packages/core-schema/src/message.ts` — 不改
- `packages/core-schema/src/conversation.ts` — 不改
- `packages/core-schema/src/adapter.ts` — 不改
- `packages/core-schema/src/bundle.ts` — 不改
- `packages/core-schema/src/errors.ts` — 不改
- `packages/core-adapters/src/base.ts` — 不改
- `packages/core-adapters/src/manifest/*` — 全部不改
- `packages/core-adapters/src/adapters/chatgpt/*` — 全部不改
- `packages/core-adapters/src/adapters/claude/*` — 全部不改
- `apps/browser-extension/src/injectors/*` — 不改（V1 injector 继续服务 AI 聊天平台）
- `apps/browser-extension/src/entrypoints/content.tsx` — 不改（主入口不变）

---

## 4. 可以删除的代码

当 V2 流程跑通后，以下代码可以被 V2 **替代**（但不急于删除，标记为 deprecated 即可）：

| 代码 | 状态 | 说明 |
|------|------|------|
| `parseWithAdapters()` | 可替代 | 被 `extractWithAdapters()` 取代，但 V1 consumer 可能还在用 |
| `ParseResult` 类型 | 可替代 | 被 `ExtractResult` 取代 |

**Phase 1-4 期间不删除任何代码**，保持完全向后兼容。

---

## 5. 不做的事（明确排除）

- **不做 Fetcher 抽象层** — 三次重复再抽象
- **不做 V2Manifest** — 代码式 adapter 更灵活，等需要时再做声明式
- **不做 V2Hooks** — 代码式 adapter 不需要 hook 注入点
- **不做 GraphQL Fetcher** — 没有 GraphQL-only 的目标平台
- **不做 OAuth** — 所有 Phase 1 目标平台都不需要
- **不做 `bearer-from-storage`** — Phase 1 只做公开数据，不需要 PAT
- **不做 Gmail / Slack / Notion** — 至少 6 个月后
- **不做粒度选择 UI**（"高票/采纳"过滤）— Phase 1 先出全量，根据用户反馈再做
- **不重写现有 ChatGPT / Claude adapter** — V1AdapterBridge 零改动复用
- **不改现有 ManifestInjector** — V1 UI 注入继续服务 AI 聊天平台

---

## 6. 风险与缓解

| 风险 | 概率 | 缓解策略 |
|------|------|---------|
| Stack Overflow DOM 结构变更 | 低（SO 很少改前端） | DOM parser 中 selector 集中定义为常量，改一处即可 |
| GitHub Issue DOM 结构变更 | 中（GitHub 偶尔改 UI） | 同上；且未来可以切到 REST API 作为 fallback |
| ContentBundle 模型不够灵活 | 低 | `meta: Record<string, unknown>` + `nodeType` 是 escape hatch |
| V1AdapterBridge 边界 case | 低 | Bridge 是纯内存转换，无 I/O，用测试覆盖即可 |
| browser extension 体积增长 | 低 | DOM parser 是纯字符串处理，不引入新依赖 |

---

> *"The best code is no code at all. The second best is code so simple that obviously it works."*
>
> V2 的实施策略：只写必须写的代码（~690 行），不动不需要动的代码（V1 全部不动），不做不需要做的事（Fetcher 抽象、V2Manifest、OAuth）。一个人，2-3 天，从 AI 聊天工具进化为通用上下文提取工具。

---

*文档维护者：全栈开发（DHH 视角）*
*最后更新：2026-02-07*
