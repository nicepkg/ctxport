import type { LocaleMessages } from "../types";

const zh: LocaleMessages = {
  // 角色
  "role.user": "用户",
  "role.assistant": "助手",
  "role.system": "系统",

  // 代码块
  "code.copy": "复制",
  "code.copied": "已复制",
  "code.copyCode": "复制代码",
  "code.copiedTitle": "已复制！",

  // Mermaid 图表
  "mermaid.loading": "图表加载中...",
  "mermaid.error": "错误",
  "mermaid.viewSource": "查看源码",

  // 网站头部
  "siteHeader.viewOnGithub": "查看 GitHub",
  "siteHeader.switchLanguage": "切换语言",

  // 网站底部
  "siteFooter.license": "以 {{license}} 许可发布。",
  "siteFooter.builtWithPrefix": "由",
  "siteFooter.builtWithSuffix": "构建",

  // 导航
  "web.nav.home": "首页",
  "web.nav.docs": "文档",

  // 页脚
  "web.footer.description":
    "一键复制 AI 对话为结构化 Markdown。支持 ChatGPT、Claude、Gemini、DeepSeek、Grok 和 GitHub。",

  // 横幅
  "web.banner.text": "CtxPort 现已开源！",
  "web.banner.linkText": "去 GitHub 给个 Star",

  // 文档
  "web.docs.editLink": "在 GitHub 上编辑此页",
  "web.docs.feedback": "有疑问？给我们反馈 →",

  // ─── 首页：Hero ───
  "web.home.hero.title": "一键复制。结构化 Markdown。任何 AI 对话。",
  "web.home.hero.subtitle":
    "把 ChatGPT、Claude、Gemini、DeepSeek、Grok、GitHub 的对话复制为干净的结构化 Context Bundle——随时随地粘贴使用。",
  "web.home.hero.install": "安装扩展",
  "web.home.hero.star": "去 GitHub Star",
  "web.home.hero.platforms": "支持平台",

  // ─── 首页：痛点 ───
  "web.home.problem.title": "痛点",
  "web.home.problem.scenario":
    "你刚花了 45 分钟和 ChatGPT 深度对话，现在需要交给 Claude 来实现。怎么办？",
  "web.home.problem.ctrlC.title": "Ctrl+A, Ctrl+C",
  "web.home.problem.ctrlC.desc":
    "HTML 残留、格式错乱、到处都是隐藏字符。",
  "web.home.problem.manual.title": "逐条手动复制",
  "web.home.problem.manual.desc": "人生苦短，47 条消息一条条复制？",
  "web.home.problem.screenshot.title": "截图",
  "web.home.problem.screenshot.desc":
    "知识的坟墓——搜不到、粘不了、毫无用处。",

  // ─── 首页：对比 ───
  "web.home.compare.title": "使用前后对比",
  "web.home.compare.without": "没有 CtxPort",
  "web.home.compare.with": "有了 CtxPort",
  "web.home.compare.copy.without": "HTML 残留、格式丢失",
  "web.home.compare.copy.with": "一键复制，干净的 Markdown",
  "web.home.compare.migrate.without": "切换 AI 工具要重新输入，上下文全丢",
  "web.home.compare.migrate.with": "粘贴 Context Bundle，上下文无缝迁移",
  "web.home.compare.save.without": "截图散落在各个文件夹",
  "web.home.compare.save.with": "结构化 Markdown 文件，带 frontmatter 元数据",
  "web.home.compare.share.without": "给同事发 20 张截图",
  "web.home.compare.share.with": "分享一个 Markdown 文件，全文可搜索",
  "web.home.compare.code.without": "代码块丢失语法高亮和缩进",
  "web.home.compare.code.with": "保留语言标签的围栏代码块",

  // ─── 首页：信任（核心优势） ───
  "web.home.trust.title": "隐私至上",
  "web.home.trust.noAccount.title": "无需注册",
  "web.home.trust.noAccount.desc": "安装即用，不需要注册、登录、邮箱。",
  "web.home.trust.offline.title": "离线可用",
  "web.home.trust.offline.desc": "所有处理都在浏览器本地完成，安装后无需联网。",
  "web.home.trust.zeroUpload.title": "零数据上传",
  "web.home.trust.zeroUpload.desc": "你的对话永远不会离开你的设备。绝对不会。",
  "web.home.trust.local.title": "100% 本地",
  "web.home.trust.local.desc": "没有服务器、没有云端、没有数据追踪。一切都在你的设备上。",
  "web.home.trust.permissions.title": "最小权限",
  "web.home.trust.permissions.desc": "只申请 AI 平台域名的访问权限，仅此而已。",
  "web.home.trust.openSource.title": "开源",
  "web.home.trust.openSource.desc": "MIT 协议开源，每一行代码都在 GitHub 上。",

  // ─── 首页：工作原理 ───
  "web.home.how.title": "工作原理",
  "web.home.how.subtitle": "无需配置。无需注册。无需云端。",
  "web.home.how.step1.title": "浏览",
  "web.home.how.step1.desc": "打开任意支持的 AI 平台，开始对话。",
  "web.home.how.step2.title": "点击",
  "web.home.how.step2.desc": "点击对话中的复制按钮，或用侧边栏列表免打开复制。",
  "web.home.how.step3.title": "粘贴",
  "web.home.how.step3.desc": "把结构化 Markdown 粘贴到任意 AI 工具、编辑器或笔记应用。",

  // ─── 首页：功能特性 ───
  "web.home.features.title": "功能特性",
  "web.home.features.inChat.title": "对话内复制",
  "web.home.features.inChat.desc":
    "复制按钮就在对话界面里，一键将当前对话复制为 Markdown。",
  "web.home.features.sidebar.title": "侧边栏列表复制",
  "web.home.features.sidebar.desc":
    "直接从侧边栏列表复制任意对话——不用打开它。高效用户的杀手级功能。",
  "web.home.features.sidebar.badge": "独家",
  "web.home.features.keyboard.title": "快捷键",
  "web.home.features.keyboard.desc":
    "按 Alt+Shift+C 即可立即复制当前对话。",
  "web.home.features.format.title": "Context Bundle 格式",
  "web.home.features.format.desc":
    "输出带 YAML frontmatter 的结构化 Markdown——标题、来源、平台、时间戳，所有元数据完整保留。",

  // ─── 首页：Context Bundle ───
  "web.home.bundle.title": "Context Bundle 格式",
  "web.home.bundle.desc":
    "每段对话都被复制为带 YAML frontmatter 元数据的结构化 Markdown 文档。",

  // ─── 首页：复制格式 ───
  "web.home.formats.title": "复制格式",
  "web.home.formats.desc": "选择适合你工作流的格式。右键菜单或选项菜单中切换。",
  "web.home.formats.format": "格式",
  "web.home.formats.includes": "包含内容",
  "web.home.formats.useCase": "适用场景",
  "web.home.formats.full.name": "完整",
  "web.home.formats.full.includes": "Frontmatter + 所有消息（用户和助手）",
  "web.home.formats.full.useCase": "在 AI 工具间迁移上下文",
  "web.home.formats.userOnly.name": "仅用户",
  "web.home.formats.userOnly.includes": "Frontmatter + 仅用户消息",
  "web.home.formats.userOnly.useCase": "用你的提问重新让另一个 AI 回答",
  "web.home.formats.codeOnly.name": "仅代码",
  "web.home.formats.codeOnly.includes": "提取所有围栏代码块",
  "web.home.formats.codeOnly.useCase": "从对话中抓取代码片段",
  "web.home.formats.compact.name": "精简",
  "web.home.formats.compact.includes": "消息内容，不含 frontmatter 元数据",
  "web.home.formats.compact.useCase": "快速粘贴到笔记或文档",

  // ─── 首页：安装指南 ───
  "web.home.install.title": "2 分钟上手",
  "web.home.install.step1": "去 GitHub Releases 下载 ctxport-chrome-mv3.zip",
  "web.home.install.step2": "解压下载的文件",
  "web.home.install.step3": "打开 Chrome，访问 chrome://extensions",
  "web.home.install.step4": "开启右上角的「开发者模式」",
  "web.home.install.step5": "点击「加载已解压的扩展程序」",
  "web.home.install.step6": "选择解压后的文件夹",
  "web.home.install.step7": "打开任意支持的 AI 平台，开始使用！",
  "web.home.install.download": "去 GitHub Releases 下载",

  // ─── 首页：支持平台 ───
  "web.home.platforms.title": "支持平台",
  "web.home.platforms.chatgpt.name": "ChatGPT",
  "web.home.platforms.chatgpt.desc": "支持 chat.openai.com 和 chatgpt.com",
  "web.home.platforms.claude.name": "Claude",
  "web.home.platforms.claude.desc": "支持 claude.ai",
  "web.home.platforms.gemini.name": "Gemini",
  "web.home.platforms.gemini.desc": "支持 gemini.google.com",
  "web.home.platforms.deepseek.name": "DeepSeek",
  "web.home.platforms.deepseek.desc": "支持 chat.deepseek.com",
  "web.home.platforms.grok.name": "Grok",
  "web.home.platforms.grok.desc": "支持 grok.com",
  "web.home.platforms.github.name": "GitHub Copilot",
  "web.home.platforms.github.desc": "支持 github.com Copilot 聊天",

  // ─── 首页：CTA ───
  "web.home.cta.title": "你的 AI 对话，值得更好的剪贴板。",
  "web.home.cta.install": "安装扩展",
  "web.home.cta.star": "去 GitHub Star",
};

export default zh;
