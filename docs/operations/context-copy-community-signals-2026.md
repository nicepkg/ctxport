# CtxPort 社区信号调研报告 (2026-02)

> 调研时间：2026-02-07
> 调研范围：Reddit、Hacker News、Twitter/X、GitHub、OpenAI Community、Chrome Web Store、行业文章
> 目标：发现 copy context 场景下未满足的需求，为 CtxPort 产品方向提供运营依据

---

## 一、社区痛点信号汇总

### 1.1 跨平台上下文迁移——最大的痛点

**痛点等级：极高**

用户在 ChatGPT、Claude、Gemini、DeepSeek 等 AI 工具间频繁切换，但每次切换都要"从零开始"。

- **OpenAI 社区**反复出现的 feature request：用户要求"导出对话到新线程继续"、"将导出的数据重新导入 ChatGPT"、"Team Workspace 的导出功能"。多个帖子获得数百赞，说明这是广泛而真实的需求。
  - [Import/Transfer Chat Context](https://community.openai.com/t/feature-suggestion-import-transfer-chat-context/1196837)
  - [Importing Exported Chat Data Back into ChatGPT](https://community.openai.com/t/importing-exported-chat-data-back-into-chatgpt/1119372)
  - [Export & Transfer Options for Team Workspaces](https://community.openai.com/t/feature-request-export-transfer-options-for-team-workspaces/1350265)

- **Claude Code GitHub Issue #18823**：用户要求 Claude Chat 和 Claude Code 之间共享上下文——"我在 Chat 中讨论了 billing 集成的方案，但 Claude Code 完全不知道这些决策"。这揭示了一个深层需求：**上下文是用户的资产，不应被锁在单一工具里。**
  - [Feature Request: Integration between Claude Code and Claude Chat Projects](https://github.com/anthropics/claude-code/issues/18823)

- **DEV Community 文章**明确指出："multi-platform AI usage is now standard, but AI memory doesn't transfer between platforms"——上下文成了平台的"护城河"和用户的"枷锁"。
  - [How to sync Context across AI Assistants](https://dev.to/anmolbaranwal/how-to-sync-context-across-ai-assistants-chatgpt-claude-perplexity-in-your-browser-2k9l)

### 1.2 Context Rot——对话越长越蠢

**痛点等级：高**

Chroma Research 2025 年的研究证实：随着输入 context 长度增加，LLM 性能系统性下降。18 个主流模型（含 GPT-4.1、Claude 4、Gemini 2.5）在测试中均出现这一现象。

- 用户的主要挫败感："对话到关键时刻，AI 突然开始胡说八道"
- 唯一的浏览器端解决方案是"开新对话"，但这意味着**丢失之前所有上下文**
- 用户急需一种方式：从长对话中**提取关键上下文**，干净地带到新对话
  - [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)
  - [Context Rot: Why AI Gets Worse the Longer You Chat](https://www.producttalk.org/context-rot/)

**CtxPort 机会**：提供"上下文精华提取"功能——不是复制整段对话，而是智能提取决策、结论、关键代码片段，形成干净的 Context Bundle。

### 1.3 导出工具频繁失效

**痛点等级：中高**

- **pionxzh/chatgpt-exporter**（主流开源 ChatGPT 导出工具，GitHub 上有大量 star）2025 年持续出现 UI 按钮被隐藏（#290）、音频内容导出无用（#298）、链接丢失（#259）等 bug，因为 ChatGPT 频繁更新 DOM 结构。
  - [chatgpt-exporter Issues](https://github.com/pionxzh/chatgpt-exporter/issues)

- 多个用户自己写脚本来导出对话（DevTools + JSON 复制、Python 脚本转 Markdown、Tampermonkey 脚本），说明现有工具**不够可靠或不够灵活**。
  - [Claude JSON to Markdown](https://simonwillison.net/2024/Aug/8/convert-claude-json-to-markdown/)
  - [ai-chat-md-export CLI](https://github.com/sugurutakahashi-1234/ai-chat-md-export)

### 1.4 安全信任危机——Chrome 扩展偷数据

**痛点等级：高（对 CtxPort 是机会）**

2025 年底爆出多起恶意 Chrome 扩展窃取 AI 对话的事件：

- 两个冒充 AI 工具的扩展，累计 90 万下载量，偷取 ChatGPT 和 DeepSeek 的对话内容
- Urban VPN Proxy（600 万安装量，4.7 分好评）被发现窃取 8 个 AI 平台的对话
- 讽刺的是，其中一个恶意扩展甚至获得了 Google "Featured" 徽章
  - [Chrome Extensions Steal ChatGPT and DeepSeek Conversations](https://www.ox.security/blog/malicious-chrome-extensions-steal-chatgpt-deepseek-conversations/)
  - [8 Million Users' AI Conversations Sold for Profit](https://www.koi.ai/blog/urban-vpn-browser-extension-ai-conversations-data-collection)

**CtxPort 机会**：隐私和安全可以成为核心差异化卖点。开源代码、数据不离开本地、零网络请求——这在当前信任危机下极有价值。

---

## 二、竞品分析与用户评价

### 2.1 直接竞品

| 工具 | 定位 | 用户量 | 主要问题 |
|------|------|--------|----------|
| **chatgpt-exporter** (pionxzh) | ChatGPT 对话导出为多种格式 | GitHub 高 star | 频繁因 ChatGPT DOM 更新而失效；仅支持 ChatGPT |
| **ChatGPT to Markdown Pro** | Chrome 扩展，对话转 Markdown | Chrome Web Store 在售 | 仅支持 ChatGPT；付费 |
| **AI Context Flow** | 跨 AI 平台的"通用记忆层" | 2,000+ 用户 | 定位是注入预设 context，不是复制对话；更像"提示词模板管理器" |
| **Context Pack** | AI 记忆迁移平台 | 新产品 | 侧重"记忆包"迁移而非实时对话复制；需要额外账户 |
| **Repomix / GitIngest** | 代码仓库打包为 AI 友好格式 | Repomix 21.4k star | 只处理代码仓库，不处理 AI 对话 |
| **claude-to-markdown** | Claude 对话导出 Markdown | GitHub 小众 | 仅支持 Claude |
| **ai-chat-md-export** | CLI 工具，转换 ChatGPT/Claude 导出数据 | 小众 | 需要先手动导出 JSON；CLI 操作门槛高 |

### 2.2 竞品核心差评/不满

1. **只支持单一平台**：大多数工具只适配 ChatGPT 或只适配 Claude，没有跨平台统一方案
2. **频繁失效**：ChatGPT/Claude 更新 DOM 后扩展就坏了，用户不得不等待开发者修复
3. **格式不适合喂给 AI**：导出的 Markdown 往往包含大量冗余信息（时间戳、UI 元素），直接粘贴到另一个 AI 效果差
4. **操作步骤多**：先导出 JSON → 下载文件 → 用脚本转换 → 手动粘贴，流程太长
5. **隐私顾虑**：用户不信任需要网络权限的扩展

### 2.3 用户提到但没有工具做的功能

- **选择性导出**：只复制对话中的特定消息，而不是整段对话
- **跨平台统一格式**：ChatGPT 和 Claude 的导出格式统一为一种标准
- **一键粘贴到目标 AI**：复制后直接打开 Claude/ChatGPT 粘贴，无需下载文件
- **上下文摘要**：自动总结长对话的关键决策和结论

---

## 三、新兴趋势总结

### 3.1 Context Engineering 成为主流概念

- Andrej Karpathy 2025 年 6 月正式推动 "context engineering" 取代 "prompt engineering"："context engineering is the delicate art and science of filling the context window with just the right information for the next step"
- Shopify CEO Tobi Lutke 等科技领袖也公开倡导这一概念
- MIT Technology Review 将 2025 年定义为"从 vibe coding 到 context engineering"的转折年
- **含义**：管理和构建上下文本身成为一种专业技能，CtxPort 的定位完全契合这个趋势
  - [Karpathy on Context Engineering](https://x.com/karpathy/status/1937902205765607626)
  - [MIT Technology Review: From vibe coding to context engineering](https://www.technologyreview.com/2025/11/05/1127477/from-vibe-coding-to-context-engineering-2025-in-software-development/)

### 3.2 MCP 生态爆发

- MCP 从 2024 年 11 月 Anthropic 内部实验发展为行业标准，SDK 月下载量达 9,700 万
- OpenAI、Google、Microsoft 均已采纳；2025 年 12 月移交 Linux Foundation 治理
- MCP Registry 已有近 2,000 个 Server 条目，增长率 407%
- **含义**：MCP 标准化了 AI 工具与外部数据源的连接方式，CtxPort 可以考虑提供 MCP Server，让 AI 工具直接"拉取" Context Bundle
  - [A Year of MCP: From Internal Experiment to Industry Standard](https://www.pento.ai/blog/a-year-of-mcp-2025-review)

### 3.3 Vibecoding 群体崛起

- Andrej Karpathy 2025 年 2 月定义 "vibe coding"，非技术用户通过自然语言描述让 AI 生成代码
- 2026 年 vibecoding 工具（Lovable、Cursor、Bolt.new）快速增长
- 这些用户的特殊需求：
  - 不会用 CLI 工具或 DevTools
  - 需要极简的"一键复制"体验
  - 频繁在多个 AI 工具间比较结果
  - 对上下文格式没有概念，需要工具自动处理
  - [Vibe Coding: Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding)
  - [Best Vibe Coding Tools 2026](https://vibecoding.app/blog/best-vibe-coding-tools)

### 3.4 企业级 Context 管理需求

- AI 知识管理市场从 2024 年 52.3 亿美元增长到 2025 年 77.1 亿美元（年增长率 47.2%）
- 80% 的企业将在 2026 年部署生成式 AI
- 企业用户需要：团队间共享 AI 对话洞察、合规导出、审计追踪
- 但当前 95% 的企业 AI 项目没有产生可衡量的 ROI，说明工具层仍有巨大空白
  - [Enterprise AI Knowledge Management Guide 2026](https://www.gosearch.ai/faqs/enterprise-ai-knowledge-management-guide-2026/)

---

## 四、高价值场景清单

### 4.1 已验证的高痛点场景

| 场景 | 痛苦程度 | 现有解决方案 | CtxPort 机会 |
|------|----------|-------------|-------------|
| 从 ChatGPT 复制对话到 Claude 继续 | 极高 | 手动复制粘贴，Context Pack | 一键复制为结构化 Markdown |
| 长对话 context rot 后"带精华开新聊" | 高 | 手动选择性复制 | 智能摘要/精华提取 |
| 从 Claude Chat 带决策上下文到 Claude Code | 高 | 无（GitHub Issue #18823 开放中） | Context Bundle 粘贴到 Claude Code |
| 多个 AI 工具比较同一问题的回答 | 中高 | 手动在多个 tab 间切换 | 统一格式方便对比 |

### 4.2 被忽视但有价值的非聊天场景

| 场景 | 描述 | 用户变通方案 |
|------|------|-------------|
| **GitHub PR/Issue → AI** | 将 PR 的代码 diff 和讨论打包给 AI 进行 code review | 手动复制代码 + 评论 |
| **Stack Overflow → AI** | 将 SO 的问题 + 高票回答打包给 AI 深入讨论 | 复制粘贴，格式混乱 |
| **技术文档 → AI** | 将 API 文档的特定章节提供给 AI 作为上下文 | 复制粘贴，常超出 token 限制 |
| **代码仓库 → AI** | 将整个 repo 结构打包给 AI 理解 | Repomix/GitIngest（21.4k star，说明需求巨大） |
| **会议记录 → AI** | 将会议纪要提供给 AI 生成 action items | 手动整理 |

### 4.3 用户自建"变通方案"信号

以下 DIY 方案暗示着未被满足的需求：

1. **DevTools 手动抓 JSON**：开发者打开浏览器开发者工具，从 Network 面板复制 Claude 对话的 JSON response
2. **Python 脚本转 Markdown**：多个 GitHub 项目（chatgpt_conversations_to_markdown 等）将 OpenAI 导出的 JSON 转为 Markdown
3. **Tampermonkey 用户脚本**：社区自制用户脚本，支持从 ChatGPT/Claude/Copilot/Gemini 导出对话
4. **CLI 工具链**：ai-chat-md-export 等离线 CLI 工具，强调"privacy-first"
5. **手动 prompt 总结**：用户让 AI "总结我们的对话要点"，然后复制粘贴到新对话

这些方案的共同特点：**步骤多、需要技术背景、容易出错、无法标准化**。

---

## 五、对 CtxPort 产品方向的运营建议

### 5.1 当前阶段判断：Pre-PMF

CtxPort 尚未发布，处于最早期的 pre-PMF 阶段。此阶段最重要的不是"增长"，而是**找到 10 个会反复使用产品的核心用户**。

### 5.2 最重要的 3 件运营动作

#### 动作 1：手动招募前 10 个用户（本周就做）

**去哪里找用户：**
- Reddit r/ClaudeAI、r/ChatGPT、r/artificial——搜索"export"、"copy conversation"、"context"相关讨论，回复那些在抱怨的人
- GitHub Issues——pionxzh/chatgpt-exporter 的 issue 区，anthropics/claude-code#18823 等
- Twitter/X——搜索 "ChatGPT to Claude" OR "copy AI conversation" OR "context engineering"
- HN——在 context engineering 相关讨论中分享 CtxPort

**怎么找：**
- 不是发广告，而是先回答他们的问题，然后自然提到"我也遇到这个问题，所以做了一个工具"
- 一对一私信那些发帖吐槽的人，邀请他们试用
- Do Things That Don't Scale：手动帮他们导出对话，让他们感受到价值

#### 动作 2：打造"隐私安全"差异化定位

2025 年底的 Chrome 扩展窃取 AI 对话丑闻创造了一个窗口期。CtxPort 应该：
- 在产品页面和所有推广中强调：**开源、数据不离开本地、零网络请求**
- 考虑发布安全审计报告或邀请社区 review 代码
- 在 Reddit 的安全讨论帖子中植入 CtxPort 作为"安全替代方案"

#### 动作 3：从最痛的场景切入——"ChatGPT ↔ Claude 上下文搬家"

不要试图覆盖所有场景，先做好一个：
- 场景：用户在 ChatGPT 中和 AI 讨论了一个问题，想把关键上下文带到 Claude 继续
- 一键操作：点击 CtxPort 按钮 → 对话自动转为结构化 Markdown → 复制到剪贴板 → 粘贴到 Claude
- 验证指标：用户是否在第二天再次使用？

### 5.3 运营陷阱警告

1. **不要过早追求多平台覆盖**：先把 ChatGPT + Claude 做到极致，再扩展到 DeepSeek/Gemini/Grok
2. **不要被 MCP 概念带偏**：MCP 是好趋势，但当前阶段用户需要的是"简单的复制粘贴"，不是"协议层集成"
3. **不要追求下载量**：Chrome Web Store 的虚荣指标（安装量）毫无意义，关注"日活跃使用次数"
4. **不要做"AI 对话管理器"**：Notion、Obsidian 已经在做知识管理，CtxPort 的价值是"流动"不是"存储"

### 5.4 可衡量的周目标

| 周次 | 目标 | 衡量指标 |
|------|------|----------|
| 发布第 1 周 | 获得 10 个真实用户 | 手动招募并跟踪 |
| 第 2 周 | 5 个用户在第二周仍在使用 | 50% 周留存率 |
| 第 3 周 | 收到 20 条用户反馈 | 每条反馈分类处理 |
| 第 4 周 | 1 个用户主动推荐给朋友 | 自然口碑传播 |

### 5.5 长期方向建议

1. **Context Bundle 标准化**：定义一种开源的 "Context Bundle" 格式（YAML frontmatter + Markdown body），让社区可以围绕它构建工具链
2. **非聊天内容的扩展**：GitHub PR、Stack Overflow、API 文档——这些场景有 Repomix（21.4k star）的成功先例证明需求存在
3. **MCP Server 集成**：在产品成熟后，提供 MCP Server 让 Claude Code 等 AI 工具直接读取 Context Bundle
4. **企业版**：团队共享的 Context Bundle 库，带权限控制和审计追踪

---

## 六、关键信号总结

> **一句话洞察**：用户不缺 AI 工具，缺的是在 AI 工具之间"搬运上下文"的简单方法。CtxPort 的机会在于成为 AI 时代的"Universal Clipboard"。

**最强社区信号：**
1. OpenAI 社区多个导出/导入 feature request 长期未解决
2. Context Engineering 从 Karpathy 的推文演变为行业共识
3. 90 万用户因恶意扩展泄露 AI 对话——信任真空
4. Context Rot 研究证实"长对话变蠢"——用户需要"提取精华开新聊"
5. 开发者自建 DIY 脚本链——产品化空白

---

*本报告基于 2026 年 2 月的公开社区讨论和行业报告，用于 CtxPort 产品运营决策参考。*
