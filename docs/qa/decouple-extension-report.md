# QA Report: Browser Extension Decoupling

**Date:** 2026-02-07
**Scope:** browser-extension/src 平台耦合消除验证
**Methodology:** Automated checks + Code review (James Bach / Rapid Software Testing)

---

## 1. Coupling Check -- PASS

```
grep -rn "chatgpt\|claude\|ChatGPT\|Claude" apps/browser-extension/src/ --include="*.ts" --include="*.tsx"
```

Result: **0 matches**. browser-extension/src 中已无任何 chatgpt/claude 硬编码。

## 2. Build -- PASS

`pnpm turbo build` 4/4 packages 全部成功（cache hit）。Extension 产物 666.56 kB。

## 3. Test -- PASS

`pnpm turbo test` 全部通过。core-markdown 19 tests, core-adapters 50 tests, 其余 passWithNoTests。

## 4. Code Review Findings

### BUG-1: Adapter 注册时序问题 (Severity: Critical)

**问题:** `app.tsx` 的 `detectManifest()` 和 `isConversationPage()` 依赖 `getRegisteredManifests()`，但 `registerBuiltinAdapters()` 仅在 `use-copy-conversation.ts` 的 `ensureAdapters()` 中被调用（且仅在用户点击 copy 时触发）。

**影响链:**
- App 首次渲染时 `detectManifest(url)` 返回 `undefined`
- `entry` 为空 -> useEffect 跳过 injector 初始化
- 无 copy button、无 list icon、无 batch checkbox 被注入
- `list-copy-icon.tsx` 和 `use-batch-mode.ts` 中的 `findAdapterByHostUrl()` 同样返回 `null`

**影响范围:** 整个 extension 功能不可用。

**修复建议:** 在 `content.tsx` 或 `app.tsx` 顶层（组件挂载前）调用 `registerBuiltinAdapters()`。例如在 `app.tsx` 的 module scope 加一行：

```ts
import { registerBuiltinAdapters } from "@ctxport/core-adapters";
registerBuiltinAdapters();
```

### 代码质量: fetchById 实现 -- GOOD

- 错误处理完备：空消息列表抛 `E-PARSE-005`，HTTP 非 200 正确上报
- bearer token 401 自动重试逻辑完整
- `extractAuthHeadless` 钩子设计合理，Claude 实现正确读取 cookie
- `conversationUrlTemplate` 合成 URL 用于 sourceType="extension-list" 场景

### 代码质量: findAdapterByHostUrl -- GOOD

- 返回 `ManifestAdapter | null`，调用方均有 null check
- `list-copy-icon.tsx:38` 正确 throw Error
- `use-batch-mode.ts:64` 正确提前 return

### 代码质量: extractAuthHeadless -- GOOD

- Claude manifest 实现直接读 `document.cookie`，不依赖 HookContext
- ChatGPT 不需要此钩子（auth 通过 bearer token API 获取）
- `manifest-adapter.ts:118-120` fallback 到 `resolveAuth(ctx)` 合理

### 其他观察

- `app.tsx` 使用 `getRegisteredManifests()` 而非 `findAdapterByHostUrl()`，逻辑重复但可接受
- manifest-injector.ts 的 `cleanup()` 正确清理 observers / timers / DOM 节点
- `use-batch-mode.ts` 中 `copySelected` 串行 fetch（for 循环），大量选中时可能慢，但不是 bug

## 5. Risk Assessment

| Risk | Level | Note |
|------|-------|------|
| BUG-1 adapter 注册时序 | **HIGH** | Blocker -- 功能完全不可用 |
| 未来新平台遗漏注册 | LOW | 需文档约束 |
| fetchById 网络失败 UX | LOW | 已有 error toast |

## 6. Conclusion

**NO-GO** -- 存在 1 个 Critical BUG（adapter 注册时序），修复后可 GO。

解耦设计本身质量高：
- 平台耦合完全消除 (0 references)
- fetchById 抽象干净，错误处理完备
- manifest-driven injector 通用性好

修复 BUG-1 后建议重新验证 injector 注入流程的端到端行为。
