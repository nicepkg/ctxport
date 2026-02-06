# ADR: ManifestAdapter.fetchById — 按 ID 获取对话的平台无关抽象

- **状态**: Proposed
- **日期**: 2026-02-07
- **决策者**: CTO (Werner Vogels)

## Context

browser-extension 中 `list-copy-icon` 和 `use-batch-mode` 需要"按 conversationId 远程获取单个对话"的能力。当前这些模块直接 import 了 ChatGPT/Claude 的 api-client 和 message-converter，产生了严重的平台耦合。

核心矛盾：`ManifestAdapter.parse(input: ExtInput)` 需要完整的 `{ url, document }`，但 list/batch 场景只有一个 `conversationId`，没有真实的页面 URL 和 document。

## Decision

### 1. Schema 层：新增 `conversationUrlTemplate`

在 `AdapterManifest` 中新增字段，用于从 conversationId 合成 URL：

```typescript
// schema.ts — AdapterManifest 新增字段
interface AdapterManifest {
  // ... existing fields ...

  /** 会话页面 URL 模板，用于从 conversationId 合成 URL。
   *  例: "https://chatgpt.com/c/{conversationId}"
   *       "https://claude.ai/chat/{conversationId}"
   */
  conversationUrlTemplate: string;
}
```

ChatGPT manifest: `"https://chatgpt.com/c/{conversationId}"`
Claude manifest: `"https://claude.ai/chat/{conversationId}"`

### 2. Hooks 层：新增 `extractAuthHeadless`

当前 `extractAuth(ctx: HookContext)` 依赖 `ctx.document`（Claude 从 `document.cookie` 读 orgId）。headless 场景下没有 document，需要一个不依赖 DOM 的替代钩子：

```typescript
// hooks.ts — AdapterHooks 新增
interface AdapterHooks {
  // ... existing hooks ...

  /**
   * 在无 document 的环境（list-copy-icon, batch-mode）中提取认证信息。
   * 运行在 content script 中，可以访问 document.cookie 但不需要完整的 HookContext.document。
   * 返回 key-value 对，注入到 URL 模板和请求头中。
   *
   * 如果未定义，fetchById 会尝试用 document.cookie 构造一个最小 HookContext 调用 extractAuth。
   */
  extractAuthHeadless?: () => Promise<Record<string, string>> | Record<string, string>;
}
```

Claude 的实现：直接读 `document.cookie`（content script 有访问权限，不需要完整的 document 引用）：

```typescript
extractAuthHeadless() {
  const cookie = document.cookie;
  const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
  if (!match?.[1]) return {};
  return { orgId: decodeURIComponent(match[1]) };
}
```

ChatGPT 不需要这个钩子——它只依赖 bearer token，已由 `getAccessToken()` 内部处理。

### 3. ManifestAdapter 层：新增 `fetchById` 方法

```typescript
// manifest-adapter.ts — ManifestAdapter 新增公开方法

class ManifestAdapter {
  // ... existing ...

  /**
   * 按 conversationId 获取远程对话并构建 Conversation。
   * 供 list-copy-icon / batch-mode 调用，不需要真实的页面 URL 和 document。
   *
   * 内部流程复用 parse 的所有阶段（auth → token → request → parseResponse → build），
   * 但用 conversationUrlTemplate 合成 URL，用 extractAuthHeadless 替代 extractAuth。
   */
  async fetchById(conversationId: string): Promise<Conversation> {
    // 1. 用模板合成虚拟 URL
    const syntheticUrl = this.manifest.conversationUrlTemplate
      .replace('{conversationId}', conversationId);

    // 2. 构建最小 HookContext（document 用 globalThis.document 兜底）
    const ctx: HookContext = {
      url: syntheticUrl,
      document: globalThis.document,  // content script 环境下可用
      conversationId,
      provider: this.manifest.provider,
    };

    // 3. 获取认证信息（优先 headless 钩子）
    const authVars = this.hooks.extractAuthHeadless
      ? await this.hooks.extractAuthHeadless()
      : this.resolveAuth(ctx);

    // 4. 获取 bearer token（如果需要）
    if (this.manifest.auth.method === 'bearer-from-api') {
      const token = await this.getAccessToken();
      authVars._bearerToken = token;
    }

    // 5-8. 复用 parse 的后续流程（buildRequestUrl, buildHeaders, fetchConversation, parseResponse）
    const templateVars = { conversationId, ...authVars };
    const requestUrl = this.buildRequestUrl(ctx, templateVars);
    const headers = this.buildHeaders(authVars);
    const response = await this.fetchConversation(requestUrl, headers);
    const { rawMessages, title } = await this.parseResponse(response, ctx);

    if (rawMessages.length === 0) {
      throw createAppError('E-PARSE-005',
        `No messages found for ${this.name} conversation ${conversationId}`);
    }

    // 9. 构建 Conversation（sourceType 为 extension-list，URL 用合成的）
    return buildConversation(rawMessages, {
      sourceType: 'extension-list',
      provider: this.manifest.provider as Provider,
      adapterId: this.id,
      adapterVersion: this.version,
      title,
      url: syntheticUrl,
    });
  }
}
```

关键设计决策：
- `sourceType` 使用 `"extension-list"` 而非 `"extension-current"`，表示来自列表/批量操作
- `document` 使用 `globalThis.document`：content script 运行在宿主页面上下文中，`globalThis.document` 就是宿主页面的 document，可以访问 cookie
- `fetchById` 是独立方法，不走 `parse` 入口，避免污染 `parse` 的类型签名

### 4. ManifestRegistry 层：按当前页面 URL 查找 adapter

extension 侧需要一种方式找到"当前页面对应的 ManifestAdapter"而不用硬编码 provider：

```typescript
// manifest-registry.ts — 新增查询方法

/**
 * 根据宿主页面 URL 查找匹配的 ManifestAdapter。
 * 用于 extension 侧确定当前平台的 adapter，无需硬编码 provider。
 */
export function findAdapterByHostUrl(url: string): ManifestAdapter | null {
  for (const entry of manifests) {
    const matches = entry.manifest.urls.hostPatterns.some(p => p.test(url));
    if (matches) {
      // 从全局 registry 取已实例化的 adapter
      return getAdapter(entry.manifest.id) as ManifestAdapter | undefined ?? null;
    }
  }
  return null;
}

/**
 * 获取所有已注册 adapter 的 conversationUrlTemplate + listItem 配置。
 * 用于 list-copy-icon 从 href 提取 conversationId。
 */
export function getListItemConfigs(): Array<{
  adapterId: string;
  provider: string;
  listItem: ListItemConfig;
  conversationUrlTemplate: string;
}> {
  return manifests.map(e => ({
    adapterId: e.manifest.id,
    provider: e.manifest.provider,
    listItem: e.manifest.injection.listItem,
    conversationUrlTemplate: e.manifest.conversationUrlTemplate,
  }));
}
```

### 5. Extension 侧调用方式

**list-copy-icon.tsx** (Before vs After):

```typescript
// BEFORE — 平台耦合
import { fetchConversationWithTokenRetry } from '@ctxport/core-adapters/adapters/chatgpt/...'
import { fetchClaudeConversation, extractClaudeOrgId } from '@ctxport/core-adapters/adapters/claude/...'

if (provider === 'chatgpt') {
  const data = await fetchConversationWithTokenRetry(convId);
  // ... platform-specific conversion ...
} else if (provider === 'claude') {
  const orgId = extractClaudeOrgId(document.cookie);
  const data = await fetchClaudeConversation(orgId, convId);
  // ... platform-specific conversion ...
}

// AFTER — 平台无关
import { findAdapterByHostUrl } from '@ctxport/core-adapters/manifest'
import type { ManifestAdapter } from '@ctxport/core-adapters/manifest'

const adapter = findAdapterByHostUrl(window.location.href)!;
const conversation = await adapter.fetchById(conversationId);
```

**use-batch-mode.ts** (Before vs After):

```typescript
// BEFORE — 平台耦合
const isChatGPT = /chatgpt\.com|chat\.openai\.com/.test(url);

// AFTER — 平台无关
const adapter = findAdapterByHostUrl(window.location.href)!;
const conversations = await Promise.all(
  selectedIds.map(id => adapter.fetchById(id))
);
```

**app.tsx** — 不再需要 `provider` prop 的硬编码传递。

## Data Flow

```
list-copy-icon / batch-mode
  │
  ├─ findAdapterByHostUrl(location.href) → ManifestAdapter
  │
  └─ adapter.fetchById(conversationId)
       │
       ├─ conversationUrlTemplate.replace('{conversationId}', id) → syntheticUrl
       ├─ extractAuthHeadless() → { orgId } (Claude) / {} (ChatGPT)
       ├─ getAccessToken() → bearer token (ChatGPT only)
       ├─ buildRequestUrl(ctx, templateVars) → API URL
       ├─ fetchConversation(url, headers) → raw JSON
       ├─ parseResponse(raw, ctx) → { rawMessages, title }
       └─ buildConversation(rawMessages, opts) → Conversation
```

## Changes Summary

| File | Change |
|------|--------|
| `schema.ts` | 新增 `conversationUrlTemplate: string` 字段 |
| `hooks.ts` | 新增 `extractAuthHeadless?` 钩子 |
| `manifest-adapter.ts` | 新增 `fetchById(conversationId)` 公开方法 |
| `manifest-registry.ts` | 新增 `findAdapterByHostUrl(url)` 和 `getListItemConfigs()` |
| `chatgpt/manifest.ts` | 新增 `conversationUrlTemplate: "https://chatgpt.com/c/{conversationId}"` |
| `claude/manifest.ts` | 新增 `conversationUrlTemplate: "https://claude.ai/chat/{conversationId}"` + `extractAuthHeadless` 钩子 |
| extension list-copy-icon | 删除所有 chatgpt/claude 直接 import，改用 `findAdapterByHostUrl` + `fetchById` |
| extension use-batch-mode | 同上 |
| extension app.tsx | 移除 `provider` 硬编码，从 adapter 获取 |

## Risks

1. **`globalThis.document` 在 content script 中的可用性**: content script 默认运行在隔离的 JS 世界中（WXT 的 `main` world），但可以访问 DOM 和 document.cookie。如果切换到 `isolated` world，cookie 访问可能受限。`extractAuthHeadless` 的设计就是为了隔离这个风险——它是一个独立钩子，可以按需切换实现（比如改用 `chrome.cookies` API）。

2. **新 provider 接入成本**: 新增平台只需在 manifest 中声明 `conversationUrlTemplate` 并实现 `extractAuthHeadless`（如果有 auth 需求），不需要修改 extension 侧任何代码。这符合 Open-Closed Principle。

3. **合成 URL 的语义正确性**: `fetchById` 生成的 URL 不是用户真实访问的 URL，但作为 `Conversation.sourceMeta.url` 存储是合理的——它是该对话的 canonical URL。
