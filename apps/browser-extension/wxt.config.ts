import { EXTENSION_HOST_PERMISSIONS } from "@ctxport/core-plugins";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "wxt";
import { toUtf8 } from "./scripts/vite-plugin-to-utf8";

export default defineConfig({
  manifest: {
    name: "CtxPort",
    description: "Copy AI conversations as Context Bundles",
    version: "0.1.0",
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    permissions: ["activeTab", "storage"],
    host_permissions: EXTENSION_HOST_PERMISSIONS,
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    action: {
      default_title: "CtxPort",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    commands: {
      "copy-current": {
        suggested_key: {
          default: "Alt+Shift+C",
          mac: "Alt+Shift+C",
        },
        description: "Copy current conversation",
      },
    },
  },
  srcDir: "src",
  outDir: "dist",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [toUtf8(), tailwindcss(), tsconfigPaths()],
    resolve: {
      conditions: ["development", "import", "browser", "default"],
    },
    optimizeDeps: {
      exclude: ["@ctxport/core-plugins", "@ctxport/core-markdown"],
    },
    build: {
      sourcemap: false,
    },
  }),
});
