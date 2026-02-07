#!/usr/bin/env node
/**
 * Sync version to browser extension manifest.json
 * Used by semantic-release to keep manifest version in sync
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");

const MANIFEST_PATH = resolve(
  ROOT_DIR,
  "apps/browser-extension/wxt.config.ts"
);

function syncVersion(version) {
  if (!version) {
    console.error("Error: version argument is required");
    process.exit(1);
  }

  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, "");

  console.log(`Syncing version ${cleanVersion} to wxt.config.ts...`);

  const content = readFileSync(MANIFEST_PATH, "utf-8");

  // Update version in manifest config
  const updatedContent = content.replace(
    /version:\s*["'][^"']*["']/,
    `version: "${cleanVersion}"`
  );

  if (content === updatedContent) {
    console.warn("Warning: version pattern not found or already up to date");
    return;
  }

  writeFileSync(MANIFEST_PATH, updatedContent, "utf-8");
  console.log(`Successfully updated version to ${cleanVersion}`);
}

// Get version from command line argument
const version = process.argv[2];
syncVersion(version);
