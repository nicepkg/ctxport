/**
 * Semantic Release Configuration for CtxPort
 *
 * This config handles:
 * - Version calculation based on conventional commits
 * - Syncing version to browser extension manifest
 * - CHANGELOG generation
 * - Git commit and tag
 * - GitHub release creation
 *
 * Note: Actual store publishing (Chrome/Edge) is handled by the
 * release-extension.yml GitHub Action using `wxt submit`
 */

const changelogFile = "CHANGELOG.md";

module.exports = {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    // Analyze commits to determine version bump
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "docs", release: false },
          { type: "style", release: false },
          { type: "chore", release: false },
          { type: "test", release: false },
          { type: "ci", release: false },
          { breaking: true, release: "major" },
        ],
      },
    ],

    // Generate release notes
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "perf", section: "Performance" },
            { type: "refactor", section: "Refactoring" },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "style", section: "Styles", hidden: true },
            { type: "chore", section: "Chores", hidden: true },
            { type: "test", section: "Tests", hidden: true },
            { type: "ci", section: "CI", hidden: true },
          ],
        },
      },
    ],

    // Update CHANGELOG.md
    ["@semantic-release/changelog", { changelogFile }],

    // Sync version to manifest and commit
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          'node scripts/sync-manifest-version.mjs "${nextRelease.version}"',
      },
    ],

    // Update package.json version (no npm publish)
    ["@semantic-release/npm", { npmPublish: false }],

    // Git commit and push
    [
      "@semantic-release/git",
      {
        assets: [
          "package.json",
          "apps/browser-extension/wxt.config.ts",
          changelogFile,
        ],
        message:
          "chore(release): v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],

    // Create GitHub release
    "@semantic-release/github",
  ],
};
