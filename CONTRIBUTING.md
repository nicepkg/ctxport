# Contributing to ctxport

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/nicepkg/ctxport/issues)
2. If not, create a new issue using the bug report template
3. Provide as much detail as possible

### Suggesting Features

1. Check if the feature has already been suggested in [Issues](https://github.com/nicepkg/ctxport/issues)
2. If not, create a new issue using the feature request template
3. Explain the use case and benefits

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `pnpm typecheck && pnpm lint`
5. Commit your changes: `git commit -m "feat: add your feature"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/nicepkg/ctxport.git
cd ctxport

# Install dependencies
pnpm install

# Start development server
pnpm dev:web

# Run type check
pnpm typecheck

# Run linter
pnpm lint
```

## Commit Convention

We follow the [Angular Commit Convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit). All commits and PR titles must follow this format:

```
<type>(<scope>): <subject>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that do not affect the meaning of the code |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding missing tests or correcting existing tests |
| `build` | Changes that affect the build system or external dependencies |
| `ci` | Changes to CI configuration files and scripts |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scopes (optional)

- `web` - Changes to the web package
- `extension` - Changes to the extension package
- `docs` - Documentation changes
- `deps` - Dependency updates

### Examples

```bash
feat(web): add dark mode toggle
fix(web): resolve hydration mismatch on mobile
docs: update README with new installation steps
chore(deps): update dependencies
refactor: simplify authentication logic
```

### Rules

- **Subject** must not be empty
- **Subject** must not end with a period
- **Subject** should not start with uppercase
- **Header** (type + scope + subject) max 100 characters

### Enforcement

- **Commits**: Validated by commitlint via husky pre-commit hook
- **PR Titles**: Validated by GitHub Action on PR open/edit

## Questions?

Feel free to open a [Discussion](https://github.com/nicepkg/ctxport/discussions) if you have any questions.
