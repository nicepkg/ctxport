import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defaultLocale, locales } from "@ctxport/shared-ui/i18n/core";
import nextra from "nextra";

const dir = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

// Alias for shared-ui source files in development
const sharedUiSrc = resolve(dir, "../../packages/shared-ui/src");

const withNextra = nextra({
  // Nextra config options
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
  contentDirBasePath: "/docs",
  unstable_shouldAddLocaleToLinks: true,
});

const svgrLoader = {
  loader: "@svgr/webpack",
  options: {
    svgoConfig: {
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              removeViewBox: false,
            },
          },
        },
        {
          name: "prefixIds",
        },
      ],
    },
  },
};

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  i18n: {
    locales,
    defaultLocale,
  },
  transpilePackages: [
    "@ctxport/shared-ui",
  ],
  // Required for image optimization
  images: {
    unoptimized: true,
  },

  // Trailing slash for better static hosting compatibility
  trailingSlash: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  turbopack: {
    rules: {
      // @ts-expect-error - turbopack rules type
      "*.svg": {
        loaders: [svgrLoader],
        as: "*.js",
      },
    },
    // Resolve @ui/* alias for shared-ui source files in development
    ...(isDev && {
      resolveAlias: {
        "@ui": sharedUiSrc,
      },
    }),
  },

  webpack(config) {
    // Add @ui/* alias for shared-ui source files in development
    if (isDev) {
      config.resolve.alias["@ui"] = sharedUiSrc;
    }
    // Grab the existing rule that handles SVG imports
    // @ts-ignore
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.(".svg"),
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: [svgrLoader],
      },
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default withNextra(config);
