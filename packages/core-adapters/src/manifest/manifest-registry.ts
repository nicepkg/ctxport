import type { AdapterManifest } from "./schema";
import type { AdapterHooks } from "./hooks";
import { ManifestAdapter } from "./manifest-adapter";
import { registerAdapter, getAdapter } from "../registry";

export interface ManifestEntry {
  manifest: AdapterManifest;
  hooks?: AdapterHooks;
}

const manifests: ManifestEntry[] = [];

/**
 * 从 manifest + hooks 创建并注册 adapter。
 */
export function registerManifestAdapter(
  entry: ManifestEntry,
): ManifestAdapter {
  const adapter = new ManifestAdapter(entry.manifest, entry.hooks);
  registerAdapter(adapter);
  manifests.push(entry);
  return adapter;
}

/**
 * 批量注册。
 */
export function registerManifestAdapters(
  entries: ManifestEntry[],
): ManifestAdapter[] {
  return entries.map(registerManifestAdapter);
}

/**
 * 获取所有已注册的 manifest 条目。
 */
export function getRegisteredManifests(): ManifestEntry[] {
  return [...manifests];
}

/**
 * 清空所有已注册的 manifest 条目（用于测试）。
 */
export function clearManifests(): void {
  manifests.length = 0;
}

/**
 * 根据宿主页面 URL 查找匹配的 ManifestAdapter。
 * 用于 extension 侧确定当前平台的 adapter，无需硬编码 provider。
 */
export function findAdapterByHostUrl(url: string): ManifestAdapter | null {
  for (const entry of manifests) {
    const matches = entry.manifest.urls.hostPatterns.some((p) => p.test(url));
    if (matches) {
      const adapter = getAdapter(entry.manifest.id);
      return (adapter as ManifestAdapter | undefined) ?? null;
    }
  }
  return null;
}
