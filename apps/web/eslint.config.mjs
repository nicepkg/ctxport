import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import {
  appBaseConfig,
  appIgnores,
  appTsRules,
  createTypeScriptConfig,
  getConfigDir,
  lintOptionsConfig,
  withTsconfigRootDir,
} from "../../configs/eslint/shared.mjs";

const configDir = getConfigDir(import.meta.url);

const nextConfigs = withTsconfigRootDir(nextCoreWebVitals, configDir);
const nextTypescriptConfigs = withTsconfigRootDir(nextTypescript, configDir);

export default defineConfig(
  ...nextConfigs,
  ...nextTypescriptConfigs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ...appIgnores,
  ]),
  {
    ...appBaseConfig,
    settings: {
      next: {
        rootDir: configDir,
      },
    },
  },
  createTypeScriptConfig({
    files: ["**/*.{ts,tsx}"],
    configDir,
    extraRules: appTsRules,
  }),
  prettier,
  lintOptionsConfig,
);
