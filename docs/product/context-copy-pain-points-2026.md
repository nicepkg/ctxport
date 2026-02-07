# Context 复制场景：用户痛点与改进机会分析

> 调研时间：2026-02-07
> 调研视角：Don Norman 可用性设计原则
> 产品：CtxPort — AI 对话的结构化剪贴板
> 关联文档：`docs/product/user-pain-points-research.md`（前期综合调研）

---

## 概述

本报告聚焦于 CtxPort 的核心场景——**从 AI 聊天平台复制对话上下文**，从认知心理学和可用性工程角度深入分析用户在"copy context"操作链路中遇到的具体痛点，并提出基于 Norman 设计原则的改进建议。

与前期综合调研（`user-pain-points-research.md`）不同，本报告专注于**操作层面**——用户按下"复制"到"粘贴到目标 AI"这段旅程中的每一个摩擦点。

---

## 1. 用户在 AI 工具间迁移上下文时遇到的真实困难

### 1.1 格式退化：从结构化内容到"一锅粥"

当用户从 AI 聊天界面复制内容时，发生了严重的**格式退化**（format degradation）：

| 内容类型 | 原始呈现 | 复制后状态 | 信息损失程度 |
|----------|----------|-----------|-------------|
| 代码块 | 语法高亮、缩进完整、语言标记 | 缩进被剥离、换行改变、语言标记丢失 | **高** — 代码需要手动修复才能运行 |
| 表格 | 对齐的行列结构 | 列消失、间距破坏、行变成不可读的长句 | **高** — 几乎完全不可用 |
| 嵌套列表 | 层级清晰的缩进结构 | 嵌套层级被扁平化，编号被重置或合并 | **中** — 信息在但结构丢失 |
| 数学公式 | LaTeX 渲染的可视化公式 | 原始 LaTeX 字符串或乱码 | **中** — 对非技术用户不可读 |
| 图片/图表 | 内嵌的可视化内容 | 完全丢失，仅留下 alt text 或空白 | **完全丢失** |
| Canvas/Artifacts | 交互式代码或文档 | 不在常规导出范围内 | **完全丢失** |
| 思维链/推理过程 | 折叠的思考步骤 | 通常不被包含在复制内容中 | **完全丢失** |

**从 Norman 的角度分析**：这违反了**映射原则（Mapping）**。用户看到的是格式丰富的结构化内容，心智模型告诉他们"我复制的就是我看到的"，但实际复制到剪贴板的是退化后的文本。**系统的概念模型（富文本呈现）与用户的操作结果（退化文本）之间存在严重不匹配**。

> 参考来源：[Copy and Paste Ruins ChatGPT Formatting](https://www.aichatexport.app/guides/chatgpt-copy-paste-formatting-issues) — "Indentation is stripped, line breaks change, and language-specific formatting is lost."

### 1.2 角色信息丢失：谁说了什么？

AI 对话有明确的角色结构（User / Assistant / System），但原生复制操作会将这些角色信息丢失：

- **纯文本复制**：所有消息被拼接成一个连续文本流，用户和 AI 的发言边界消失
- **批量选择困难**：大多数 AI 平台不支持跨消息的连续选择，用户被迫逐条复制
- **元数据全部丢失**：时间戳、模型版本、使用的工具（web search、code interpreter）等信息完全消失

**CtxPort 当前的处理**：通过 `ContentNode.participantId` 和 `Participant.role` 保留角色信息，序列化时使用 `## User` / `## Assistant` 标记。这比原生复制好很多，但用户可能不知道这个差异存在。

### 1.3 不同 AI 工具对输入上下文的处理差异

即便成功将上下文从 AI-A 复制到 AI-B，不同平台对输入的处理方式差异也会造成认知负担：

| 目标平台 | 处理方式 | 用户感知问题 |
|----------|----------|-------------|
| ChatGPT | 将粘贴内容视为用户的一条长消息 | AI 无法区分"原始对话结构"和"用户当前指令" |
| Claude Projects | 支持作为项目知识上传 | 需要额外操作步骤（上传文件），不是直接粘贴 |
| Gemini | 正在测试"Import AI Chats"功能 | 需要先从原平台导出完整文件，不是剪贴板操作 |
| Claude Code | 可以引用文件作为上下文 | 需要先保存为文件，再引用 |
| Cursor | 通过 .cursorrules 和 @reference | 格式与 Markdown 不同，需要转换 |

**关键发现**：2026 年 2 月，Google Gemini 正式测试"Import AI Chats"功能，允许用户从 ChatGPT、Claude 等平台导入聊天历史。这标志着**平台方开始正视上下文可移植性**问题，但目前仅支持文件导入，不支持剪贴板级别的快速迁移。

> 参考来源：[Google Gemini tests Import AI Chats](https://www.technobezz.com/news/google-gemini-tests-a-feature-to-import-chat-history-from-ch-2026-02-03-4voj)

### 1.4 Context Window 限制对打包决策的影响

长对话的 context window 限制迫使用户做出"打包决策"，但缺乏信息支撑：

- **不知道该保留什么**：一个 200 轮的对话，用户无法判断哪些轮次包含关键决策、哪些是无关的探索
- **不知道目标容量**：不同模型的 context window 差异巨大（GPT-4o 128K vs Claude Sonnet 200K vs Gemini 1M），用户不知道打包后能否放得下
- **过度压缩的恐惧**：用户担心压缩会丢失关键信息，宁愿粘贴过多内容，结果导致 token 浪费和"Context Rot"

**CtxPort 当前能力**：提供 token 估算（`token-estimator.ts` 使用 `tokenx` 库），并在 frontmatter 中标注。但缺少：
- 按目标模型计算 token 的能力
- 上下文占比可视化（"这个 bundle 占了 Claude Sonnet context window 的 35%"）
- 智能裁剪建议

---

## 2. 当前 CtxPort 产品体验中的摩擦点

### 2.1 可供性（Affordance）分析

**复制按钮注入**：CtxPort 通过 `chat-injector.ts` 将复制按钮注入到 AI 聊天界面中。

已做到的：
- 复制按钮被注入到主内容区域的固定位置
- 左侧列表的 hover 图标提供"不打开就能复制"的快捷操作

潜在摩擦点：

| 摩擦点 | Norman 原则 | 影响 |
|--------|------------|------|
| 注入延迟 2 秒（`INJECTION_DELAY_MS = 2000`） | 反馈及时性 | 页面加载后 2 秒内用户看不到复制按钮，可能误以为扩展未工作 |
| 列表图标默认隐藏，hover 才显示 | 可发现性 | 用户可能完全不知道列表上有复制功能 |
| 缺少安装后引导 | 可发现性 | 新用户不知道在哪里找到功能、如何使用 |
| 与宿主页面的视觉融合 | 可供性一致性 | 好的方面：不突兀；坏的方面：可能被忽略 |

**从 Norman 的角度**：左侧列表的 hover 复制按钮是一个精巧但**可发现性低**的设计。它遵循了"不打扰"的原则，但可能因为太低调而让用户完全不知道它的存在。**好的可供性不是"按需显示"，而是"让用户知道有东西可以显示"**。

### 2.2 心智模型分析：复制 vs 打包

用户对"复制对话"的心智模型与 CtxPort 的"打包上下文"之间存在认知差距：

**用户的心智模型**（基于日常复制操作）：
- "复制"意味着选中 → Ctrl+C → 得到和看到的一样的内容
- 结果应该是**所见即所得**
- 操作是**即时的**、**无损的**

**CtxPort 的实际行为**：
- 提取 API 数据（不是 DOM 文本），通过适配器转换为 ContentBundle
- 序列化为带 frontmatter 的 Markdown 格式
- 提供 4 种格式选项（full / user-only / code-only / compact）

**差距分析**：

1. **选择的困惑**：用户按下"复制"后被要求在 4 种格式中选择——这要求用户先理解每种格式的含义和适用场景。对于"我只想复制这个对话"的用户来说，**选择本身就是认知负担**
2. **格式化的惊讶**：复制后粘贴出来的是 Markdown 格式的文本（带 `---` frontmatter、`## User` 标题），与用户预期的"原样复制"不同
3. **完整性的不确定**：用户不确定 API 提取的内容是否与他们看到的页面内容完全一致

**改进建议**：
- 提供"智能默认"：默认使用 `full` 格式，只有高级用户需要切换
- 复制后的 toast 通知应包含摘要信息："已复制 42 条消息（~8.5K tokens）"
- 考虑提供"复制预览"功能，让用户在复制前看到将会得到什么

### 2.3 反馈（Feedback）分析

操作反馈的完整性直接决定用户的信心：

| 操作 | 当前反馈 | 缺失反馈 |
|------|----------|----------|
| 点击复制按钮 | Toast 通知"复制成功" | 内容摘要（多少消息、多少 token、什么格式） |
| 复制长对话 | 相同的 Toast | 处理进度（大型对话的提取可能需要数秒） |
| 复制失败 | 错误提示 | 失败原因和恢复建议（API 变更？网络问题？） |
| 列表项复制 | Toast 通知 | 不打开就复制的情况下，用户看不到复制了什么 |

**关键缺失**：用户复制后**无法确认内容的完整性**。他们不知道：
- 是否所有消息都被包含了？
- 代码块是否完整？
- 图片/附件是否被处理了（或被跳过了）？
- Thinking/Reasoning 的折叠部分是否被包含了？

**从 Norman 的角度**：这违反了**反馈原则**中最重要的一条——**操作结果的确认**。好的反馈不仅告诉用户"操作完成了"，还要告诉用户"操作的结果是什么"。

### 2.4 容错（Error Prevention & Recovery）分析

| 错误场景 | 当前处理 | 改进方向 |
|----------|----------|----------|
| AI 平台 DOM 结构变更导致注入失败 | 静默失败 | 应显示"CtxPort 可能需要更新"的提示 |
| API 返回不完整数据 | 可能输出不完整的 bundle | 应警告"检测到 X 条消息可能不完整" |
| 用户意外复制了包含敏感信息的对话 | 无处理 | 应提供"复制前预览"或"脱敏选项" |
| 复制内容超过目标 AI 的 context window | 无处理 | 应提示"此内容约 XX tokens，可能超出 [模型] 的限制" |
| 用户选错了格式 | 重新复制 | 应支持"最近复制"历史，可以用不同格式重新导出 |

---

## 3. 未被满足的用户需求

### 3.1 部分复制需求

**需求场景**：

- **"只复制最后 N 轮"**：用户在长对话中只需要最近的讨论，不需要完整历史。目前 CtxPort 只支持按角色过滤（user-only），不支持按位置范围过滤
- **"只复制某个话题分支"**：ChatGPT 的分支对话（branching）产生了多条讨论线索，用户只想要其中一条
- **"只复制代码变更部分"**：在 coding 对话中，用户只需要最终的代码方案，不需要中间的讨论
- **"跳过失败的尝试"**：AI 给出了多个方案，前几个被否决了，用户只想要最终采纳的方案

**竞品对比**：
- **AI Chat Exporter** 提供逐条消息的 checkbox 选择（粒度最细）
- **Gemini Exporter** 支持"All / Only answers / None"快速切换
- **CtxPort** 目前提供 4 种格式预设（full/user-only/code-only/compact），但无逐条选择能力

**从 Norman 的角度**：这是**渐进式披露（Progressive Disclosure）**的应用场景。默认复制全部是正确的，但应该提供一个轻量级的方式让用户精炼选择，而不是要求他们打开一个复杂的选择界面。

### 3.2 复制后编辑需求

**需求场景**：

- **删除敏感信息**：API keys、密码、个人信息混在对话中，用户需要在分享前脱敏
- **添加上下文说明**：在打包的对话前面加一段说明："这是关于 XX 项目的架构讨论，请基于此继续…"
- **调整顺序**：重新排列消息顺序以突出重点
- **合并多个对话**：将分散在多个会话中的相关讨论合并为一个 bundle

**CtxPort 当前能力**：
- `serializeBundle()` 支持合并多个 ContentBundle，但用户层面没有暴露此能力
- 没有复制后编辑的 UI

**改进建议**：
- 短期：复制后在 toast 中添加"在新标签页中编辑"的选项，打开一个简单的 Markdown 编辑器
- 中期：在扩展 popup 中维护"最近复制"历史，支持重新编辑和重新复制
- 长期：集成简单的脱敏规则（正则匹配 API key 格式、邮箱地址等）

### 3.3 跨工具的上下文连续性需求

用户的真实需求不只是"复制一次"，而是**持续的上下文同步**：

**需求层次**：

| 层次 | 描述 | 当前解决方案 | 差距 |
|------|------|------------|------|
| L1：一次性迁移 | 把对话从 A 复制到 B | CtxPort 一键复制 | **基本满足** |
| L2：记忆迁移 | 把 A 记住的偏好带到 B | Claude Memory Import / Context Pack | 需要文件导出导入，非即时 |
| L3：实时同步 | 在 A 中建立的知识自动出现在 B | AI Context Flow / OpenMemory | 仅覆盖 Web，不覆盖 CLI |
| L4：智能路由 | 根据任务自动选择最合适的 AI 并带上上下文 | **不存在** | 完全空白 |

**2026 年最新动态**：
- Claude 推出了 Memory 功能并支持从 ChatGPT 导入 Memory
- Google Gemini 正在测试"Import AI Chats"功能
- 平台方开始打破壁垒，但仅限于自家生态

**CtxPort 的机会**：专注于 L1（一次性迁移）做到极致，并逐步向 L2（记忆迁移）拓展。L3/L4 的需求虽然存在，但超出了浏览器扩展的能力边界。

### 3.4 非文字内容的处理需求

**当前被完全忽略的内容类型**：

| 内容类型 | 使用频率 | 技术可行性 | 优先级 |
|----------|----------|-----------|--------|
| AI 生成的图片/图表 | 中 | 低（需要 blob/URL 处理） | P2 |
| 用户上传的附件 | 中 | 低（无法从 API 获取原始文件） | P3 |
| Canvas / Artifacts | 高 | 中（需要特殊 API 适配） | P1 |
| Web Search 引用/Citations | 高 | 高（已在文本中标记） | P0 |
| Code Interpreter 运行结果 | 中 | 中（部分在 API 中可获取） | P1 |
| Thinking/Reasoning 过程 | 高 | 高（ChatGPT 已有 `thoughts-flattener`） | **已处理** |

**CtxPort 当前能力**：ChatGPT 适配器已有 `thoughts-flattener.ts` 和 `tool-response-flattener.ts`，说明非文本内容的处理有基础架构支撑。但 Canvas/Artifacts 和 Web Search Citations 是近期用户强烈需求的内容类型，竞品 YourAIScroll 已经支持 Canvas 和 Citations 的导出。

---

## 4. 竞品对比分析

### 4.1 AI 会话导出工具对比

| 特性 | **CtxPort** | **AI Chat Exporter** | **YourAIScroll** | **SaveYourChat** | **Save my Chatbot** |
|------|-----------|---------------------|-----------------|-----------------|-------------------|
| 支持平台数 | 6 (ChatGPT, Claude, DeepSeek, Gemini, GitHub, Grok) | 主要 Claude | 10+ | 7+ | 4 |
| 导出格式 | Markdown (结构化 Bundle) | PDF, MD, TXT, JSON, CSV, Image | MD, HTML, JSON, TXT | MD, PDF, TXT | MD |
| 选择性导出 | 4 种预设格式 | 逐条 checkbox 选择 | 全部/仅回答/无 | 全部 | 全部 |
| 不打开即可复制 | **独有** (列表 hover 按钮) | 否 | 否 | 否 | 否 |
| Token 估算 | **有** | 否 | 否 | 否 | 否 |
| 元数据保留 | **有** (frontmatter) | 有限 | 有限 | 否 | 否 |
| Canvas/Artifacts 支持 | 否 | 否 | **有** | 否 | 否 |
| Notion 同步 | 否 | 否 | **有** | **有** | 否 |
| 本地处理 | **是** | PDF 需服务器 | 否 | **是** | 是 |
| 定价 | 免费 | 免费+付费 | 免费+付费 | 免费+付费 | 免费 |

**CtxPort 独特优势**：
1. **列表不打开即复制** — 在所有竞品中独一无二，将操作步骤从 3-4 步减少到 1 步
2. **结构化 Context Bundle** — 不是简单的文本导出，而是带元数据、角色标记、token 估算的结构化格式
3. **完全本地处理** — 零上传架构，在浏览器扩展信任危机后是重要的差异化

**CtxPort 需补齐的差距**：
1. **选择性导出** — 竞品已支持逐条选择，CtxPort 仅有预设格式
2. **Canvas/Artifacts 支持** — YourAIScroll 已经支持
3. **知识管理集成** — 缺少 Notion/Obsidian 同步能力

### 4.2 Context Engineering 工具对比

| 特性 | **CtxPort** | **Repomix** | **Context Pack** | **AI Context Flow** |
|------|-----------|-----------|----------------|-------------------|
| 核心定位 | AI 对话 → 结构化 Markdown | 代码仓库 → AI 友好文件 | ChatGPT Memory → Claude | 跨平台 Memory 同步 |
| 内容来源 | Web AI 聊天界面 | 本地代码仓库 | ChatGPT 导出文件 | 浏览器中的 AI 对话 |
| 输出格式 | Markdown + frontmatter | XML/Markdown/Plain Text | Claude 优化的上下文文件 | 注入到目标 AI 的 prompt |
| Token 管理 | 估算 + 显示 | 精确计数 + 压缩 | 摘要压缩 | 无 |
| 使用方式 | 浏览器扩展（1 键） | CLI 命令 | Web 上传 | 浏览器扩展（自动） |
| 数据流向 | AI → 剪贴板 → AI | 代码 → 文件 → AI | ChatGPT → 文件 → Claude | AI ↔ Memory Layer ↔ AI |

**关键洞察**：CtxPort 和 Repomix 覆盖了两个互补的场景——前者处理 AI 对话上下文，后者处理代码仓库上下文。两者的结合才是开发者的完整上下文管理方案。Context Pack 专注于"AI 记忆迁移"这个更深层的需求，而 AI Context Flow 走的是"实时同步"路线。

**市场机会**：没有任何一个工具同时覆盖"会话上下文"和"代码上下文"两个维度。CtxPort 的 Plugin 架构（已支持 GitHub）暗示了向这个方向拓展的可能性。

---

## 5. 痛点清单（按严重程度排序）

### 5.1 关键痛点（影响核心体验）

| # | 痛点 | 严重程度 | 影响场景 | 改进优先级 |
|---|------|---------|---------|-----------|
| 1 | **复制后缺乏内容确认反馈** — 用户不知道复制了多少消息、是否完整、大概多少 token | 高 | 每次复制 | **P0** |
| 2 | **不支持部分复制** — 只有 4 种预设格式，无法选择特定消息范围（如"最后 5 轮"） | 高 | 长对话复制 | **P0** |
| 3 | **注入按钮可发现性不足** — 列表 hover 按钮太隐蔽，新用户可能不知道存在 | 中 | 首次使用 | **P1** |
| 4 | **无 Canvas/Artifacts 支持** — 竞品已支持，CtxPort 缺失 | 中 | ChatGPT Canvas / Claude Artifacts 场景 | **P1** |
| 5 | **无目标模型感知** — Token 估算是通用的，不能针对目标模型（GPT-4o / Claude / Gemini）给出建议 | 中 | 跨平台迁移 | **P2** |
| 6 | **无复制历史** — 复制后无法回溯、重新编辑或用不同格式重新导出 | 低 | 多次迁移 | **P2** |
| 7 | **注入延迟** — 2 秒的初始延迟可能让用户误以为扩展未工作 | 低 | 页面刚加载时 | **P2** |

### 5.2 潜在痛点（随用户规模增长会暴露）

| # | 痛点 | 触发条件 |
|---|------|---------|
| 8 | **敏感信息泄露风险** — 复制的对话可能包含 API keys、密码 | 团队协作、公开分享 |
| 9 | **平台 DOM 变更导致注入失败** — 无优雅降级或更新提示 | AI 平台 UI 更新 |
| 10 | **多个对话无法合并** — 底层支持但 UI 未暴露 | 需要组合多个来源的上下文 |
| 11 | **Web Search Citations 丢失** — 用户需要引用来源但复制后丢失 | 搜索增强型对话 |

---

## 6. 改进建议与优先级

### 6.1 短期改进（1-2 周，核心体验提升）

**1. 增强复制反馈 [P0]**

当前 toast 仅显示"复制成功"，应改为富信息反馈：

```
已复制 42 条消息 | ~8.5K tokens | full 格式
[重新选择格式] [预览内容]
```

这直接回应了 Norman 的**反馈原则**：每一个操作都必须有明确的结果确认。

**2. 添加"最近 N 轮"快速选项 [P0]**

在 4 种预设格式之外，增加一个基于位置的过滤选项：
- "最近 5 轮"
- "最近 10 轮"
- "自定义范围"

这比逐条 checkbox 选择更轻量，同时解决了长对话复制的核心需求。

**3. 新用户引导提示 [P1]**

安装后首次访问支持的 AI 平台时，显示一次性的引导气泡：
- 指向注入的复制按钮
- 指向列表 hover 图标
- 提示"试试在左侧列表悬停查看快速复制按钮"

### 6.2 中期改进（1-2 月，差异化功能）

**4. Canvas/Artifacts 内容提取 [P1]**

通过扩展 ChatGPT 和 Claude 的适配器，支持提取 Canvas 和 Artifacts 内容。YourAIScroll 已证明技术可行性。

**5. 目标模型感知的 Token 预算 [P2]**

在 toast 或预览中显示：
```
此 bundle 在 Claude Sonnet 下约 8.5K tokens（占 context window 4.2%）
在 GPT-4o 下约 9.1K tokens（占 context window 7.1%）
```

**6. 复制历史面板 [P2]**

在扩展 popup 中维护最近 10 次复制的记录，支持：
- 重新复制（不同格式）
- 编辑后重新复制
- 查看内容摘要

### 6.3 长期方向（3-6 月，生态拓展）

**7. 知识管理集成**

支持一键导出到 Obsidian、Notion 等知识管理工具，从"剪贴板工具"升级为"上下文管理工具"。

**8. 智能脱敏**

自动检测并高亮可能的敏感信息（API keys、email 地址、IP 地址），允许用户在复制前选择是否脱敏。

**9. 与 Repomix 格式互通**

支持读取 Repomix 输出的代码上下文，与 CtxPort 的对话上下文合并，形成完整的"项目上下文包"。

---

## 7. 总结

### CtxPort 的核心优势已经确立

1. **列表不打开即复制** — 在所有竞品中独一无二
2. **结构化 Context Bundle** — 比简单的文本导出有更高的信息密度
3. **完全本地处理** — 在信任危机时代是重要的差异化
4. **Plugin 架构** — 可扩展到更多平台（已有 6 个 plugin）

### 最迫切的改进方向

1. **反馈增强**：让用户复制后**确信**内容完整、格式正确
2. **部分复制**：解决长对话场景下"要么全有要么全无"的问题
3. **可发现性**：让新用户更快找到并理解功能

### Don Norman 的启示

> "People do not always err. But they do err when the things they use are badly conceived and designed." — Don Norman, *The Design of Everyday Things*

CtxPort 当前的错误不在于功能缺失，而在于**功能的可发现性和操作的反馈闭环不够完善**。用户不知道功能在哪里（可发现性），不确定操作结果是什么（反馈），也没有简单的方式来精炼选择（约束）。修复这三个维度，产品体验会有质的提升。

---

## 参考来源

- [AI Chat Exporter](https://www.ai-chat-exporter.net/en/welcome) — Claude 对话导出工具
- [YourAIScroll](https://www.youraiscroll.com/changelog) — 多平台 AI 会话导出扩展
- [Context Pack](https://www.context-pack.com/docs/transfer-chatgpt-to-claude) — ChatGPT 到 Claude 的上下文迁移
- [AI Context Flow](https://plurality.network/ai-context-flow/) — 跨平台 AI 上下文同步
- [SaveYourChat](https://saveyourchat.com/) — AI 会话导出与知识管理
- [Repomix](https://repomix.com/) — 代码仓库 AI 友好打包
- [Copy and Paste Ruins ChatGPT Formatting](https://www.aichatexport.app/guides/chatgpt-copy-paste-formatting-issues) — 格式退化问题分析
- [Stop Losing Context When Switching AI Platforms](https://plurality.network/blogs/universal-ai-context-to-switch-ai-tools/) — 上下文迁移痛点
- [Google Gemini Tests Import AI Chats](https://www.technobezz.com/news/google-gemini-tests-a-feature-to-import-chat-history-from-ch-2026-02-03-4voj) — Gemini 的聊天导入功能
- [Claude Memory and ChatGPT Sync](https://www.tomsguide.com/ai/claude-just-unlocked-memory-that-syncs-with-chatgpt-heres-how-it-works) — Claude Memory 跨平台同步
- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic 的上下文工程指南
- [The Context Window Problem](https://factory.ai/news/context-window-problem) — Context Window 管理挑战
