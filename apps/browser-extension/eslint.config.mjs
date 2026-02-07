import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import {
  appBaseConfig,
  appTsRules,
  createTypeScriptConfig,
  getConfigDir,
  lintOptionsConfig,
  packageIgnores,
} from "../../configs/eslint/shared.mjs";
import prettier from "eslint-config-prettier/flat";

const configDir = getConfigDir(import.meta.url);

export default defineConfig(
  globalIgnores([...packageIgnores, ".output/**", ".wxt/**"]),
  { ...appBaseConfig },
  createTypeScriptConfig({
    files: ["**/*.{ts,tsx}"],
    configDir,
    globals: {
      ...globals.browser,
      ...globals.node,
    },
    extraRules: appTsRules,
  }),
  prettier,
  lintOptionsConfig,
);
