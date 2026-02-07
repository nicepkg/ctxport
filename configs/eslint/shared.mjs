import path from "node:path";
import { fileURLToPath } from "node:url";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettier from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

/** @typedef {import("eslint").Linter.Config} Config */
/** @typedef {Config[]} ConfigArray */

export const packageIgnores = ["dist/**", "node_modules/**", "*.config.*", ".turbo/**", ".next/**", ".output/**", ".open-next/**", ".wxt/**"];
export const appIgnores = ["node_modules/**", ".git/**", ...packageIgnores];

const unusedVarsRule = [
  "warn",
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
    caughtErrorsIgnorePattern: "^_",
  },
];

export const baseTsRules = {
  "@typescript-eslint/no-unused-vars": unusedVarsRule,
  "@typescript-eslint/no-explicit-any": "warn",
};

export const appBaseConfig = {
  files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
  plugins: {
    import: eslintPluginImport,
    prettier: eslintPluginPrettier,
  },
  rules: {
    "@typescript-eslint/only-throw-error": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    '@typescript-eslint/no-unnecessary-condition': 'off',
    "import/no-anonymous-default-export": "warn",
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "never",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "prettier/prettier": "warn",
  },
};

export const appTsRules = {
  ...baseTsRules,
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/only-throw-error": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/no-empty-object-type": "off",
  "@typescript-eslint/ban-ts-comment": "off",
  "@typescript-eslint/triple-slash-reference": "off",
  "@typescript-eslint/array-type": "off",
  "@typescript-eslint/consistent-type-definitions": "off",
  "@typescript-eslint/consistent-type-imports": [
    "warn",
    {
      prefer: "type-imports",
      fixStyle: "inline-type-imports",
    },
  ],
  "@typescript-eslint/require-await": "off",
  "@typescript-eslint/no-misused-promises": [
    "error",
    {
      checksVoidReturn: {
        attributes: false,
      },
    },
  ],
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/no-unnecessary-condition": "off",
};

export const lintOptionsConfig = {
  linterOptions: {
    reportUnusedDisableDirectives: "warn",
  },
};

/**
 * @param {object} options
 * @param {string[]} options.files
 * @param {string} options.configDir
 * @param {boolean} [options.typeChecked]
 * @param {Record<string, boolean>} [options.globals]
 * @param {Record<string, unknown>} [options.parserOptions]
 * @param {Record<string, unknown>} [options.extraRules]
 * @returns {Config}
 */
export const createTypeScriptConfig = ({
  files,
  configDir,
  typeChecked = true,
  globals = {},
  parserOptions = {},
  extraRules = {},
}) => {
  const baseExtends = [...tseslint.configs.recommended];
  const typedExtends = [
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ];

  return {
    files,
    extends: typeChecked ? [...baseExtends, ...typedExtends] : baseExtends,
    languageOptions: {
      globals,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: configDir,
        ...parserOptions,
      },
    },
    rules: {
      ...baseTsRules,
      ...extraRules,
    },
  };
};

/**
 * @param {ConfigArray} configs
 * @param {string} configDir
 * @returns {ConfigArray}
 */
export const withTsconfigRootDir = (configs, configDir) =>
  configs.map((config) => {
    const languageOptions =
      config.languageOptions && typeof config.languageOptions === "object"
        ? config.languageOptions
        : {};
    const parserOptions =
      "parserOptions" in languageOptions &&
      languageOptions.parserOptions &&
      typeof languageOptions.parserOptions === "object"
        ? languageOptions.parserOptions
        : {};

    return {
      ...config,
      languageOptions: {
        ...languageOptions,
        parserOptions: {
          ...parserOptions,
          tsconfigRootDir: configDir,
        },
      },
    };
  });

/**
 * @param {string} metaUrl
 */
export const getConfigDir = (metaUrl) => path.dirname(fileURLToPath(metaUrl));
