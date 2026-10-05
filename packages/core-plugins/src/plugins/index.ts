import { registerPlugin } from "../registry";
import { chatgptPlugin } from "./chatgpt/plugin";
import { claudePlugin } from "./claude/plugin";
import { deepseekPlugin } from "./deepseek/plugin";
import { geminiPlugin } from "./gemini/plugin";
import { githubPlugin } from "./github/plugin";
import { grokPlugin } from "./grok/plugin";
import { kimiPlugin } from "./kimi/plugin";

export function registerBuiltinPlugins(): void {
  registerPlugin(chatgptPlugin);
  registerPlugin(claudePlugin);
  registerPlugin(deepseekPlugin);
  registerPlugin(geminiPlugin);
  registerPlugin(githubPlugin);
  registerPlugin(grokPlugin);
  registerPlugin(kimiPlugin);
}

export { chatgptPlugin } from "./chatgpt/plugin";
export { claudePlugin } from "./claude/plugin";
export { deepseekPlugin } from "./deepseek/plugin";
export { geminiPlugin } from "./gemini/plugin";
export { githubPlugin } from "./github/plugin";
export { grokPlugin } from "./grok/plugin";
export { kimiPlugin } from "./kimi/plugin";
