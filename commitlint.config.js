// @ts-check

/**
 * Commitlint configuration
 * @see https://commitlint.js.org/
 *
 * Follows Angular commit convention:
 * <type>(<scope>): <subject>
 *
 * Types:
 * - feat:     A new feature
 * - fix:      A bug fix
 * - docs:     Documentation only changes
 * - style:    Changes that do not affect the meaning of the code
 * - refactor: A code change that neither fixes a bug nor adds a feature
 * - perf:     A code change that improves performance
 * - test:     Adding missing tests or correcting existing tests
 * - build:    Changes that affect the build system or external dependencies
 * - ci:       Changes to CI configuration files and scripts
 * - chore:    Other changes that don't modify src or test files
 * - revert:   Reverts a previous commit
 *
 * Examples:
 * - feat(web): add dark mode toggle
 * - fix(api): handle null response from server
 * - docs: update README with installation instructions
 * - chore: update dependencies
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Type cannot be empty
    'type-empty': [2, 'never'],
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Header max length
    'header-max-length': [2, 'always', 100],
  },
};
