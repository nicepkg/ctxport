export type { AdapterManifest } from "./schema";

export type { AdapterHooks, HookContext } from "./hooks";

export { ManifestAdapter } from "./manifest-adapter";

export {
  registerManifestAdapter,
  registerManifestAdapters,
  getRegisteredManifests,
  clearManifests,
  findAdapterByHostUrl,
} from "./manifest-registry";
export type { ManifestEntry } from "./manifest-registry";

export { getByPath, resolveTemplate } from "./utils";
