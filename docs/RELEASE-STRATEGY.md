# RangeLink Monorepo Release Strategy

This document defines the release management, versioning, and tagging strategy for the RangeLink monorepo.

## Table of Contents

- [Overview](#overview)
- [Tagging Convention](#tagging-convention)
- [Versioning Strategy](#versioning-strategy)
- [Release Workflow](#release-workflow)
- [Retroactive Tagging](#retroactive-tagging)
- [GitHub Releases](#github-releases)
- [Examples](#examples)

---

## Overview

RangeLink is a monorepo containing multiple independently versioned and published packages:

- **rangelink-vscode-extension** - VS Code extension (published to VS Code Marketplace)
- **rangelink-core-ts** - Core TypeScript library (published to npm) - Future
- **Future extensions** - Neovim, Sublime Text, etc.

Each package is versioned and released independently, allowing for different release cadences and version numbers.

---

## Tagging Convention

### Format

All git tags follow this format:

```
{package-name}-v{semver}
```

### Examples

- `vscode-extension-v0.1.0` - VS Code extension version 0.1.0
- `vscode-extension-v0.1.1` - VS Code extension version 0.1.1
- `core-ts-v1.0.0` - Core library version 1.0.0 (future)
- `neovim-plugin-v0.1.0` - Neovim plugin version 0.1.0 (future)

### Why This Format?

1. **Clear package identification** - Immediately know which package a tag refers to
2. **Sortable** - Git tags sort correctly chronologically within each package
3. **GitHub release compatibility** - Works well with GitHub's release UI
4. **Grep-friendly** - Easy to filter: `git tag -l "vscode-extension-v*"`
5. **Semantic versioning** - Follows semver with `v` prefix convention

### Package Name Conventions

| Package Directory | Tag Prefix | Example Tag |
|-------------------|------------|-------------|
| `packages/rangelink-vscode-extension/` | `vscode-extension-` | `vscode-extension-v0.1.0` |
| `packages/rangelink-core-ts/` | `core-ts-` | `core-ts-v1.0.0` |
| `packages/rangelink-neovim-plugin/` | `neovim-plugin-` | `neovim-plugin-v0.1.0` |

**Rule:** Use the shortest unambiguous package identifier, removing `rangelink-` prefix.

---

## Versioning Strategy

### Semantic Versioning

All packages follow [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** - Breaking changes, incompatible API changes
- **MINOR** - New features, backward-compatible functionality
- **PATCH** - Bug fixes, backward-compatible fixes

### Independent Versioning

Each package maintains its own version number independently:

- VS Code extension might be at `v0.5.0`
- Core library might be at `v1.2.0`
- They don't need to stay in sync

### Pre-release Versions

For alpha/beta releases, use semver pre-release syntax:

```
vscode-extension-v0.2.0-alpha.1
vscode-extension-v0.2.0-beta.1
vscode-extension-v0.2.0-rc.1
```

### Version Synchronization Rules

**When to bump versions:**

1. **Extension depends on core library** → If core has breaking changes, extension must update
2. **Independent features** → Extension and core can version independently
3. **Marketplace publishing** → Always bump version (marketplace requirement)

---

## Release Workflow

### Manual Release Process (Current)

This is the current manual process for releasing a package. Automated workflows will be added in the future.

#### Phase 1: Prepare Release

1. **Ensure working tree is clean**
   ```bash
   git status
   # Should show: "nothing to commit, working tree clean"
   ```

2. **Update package version**
   ```bash
   cd packages/rangelink-vscode-extension
   # Edit package.json: "version": "0.1.1"
   ```

3. **Update CHANGELOG.md**
   ```bash
   # Edit packages/rangelink-vscode-extension/CHANGELOG.md
   # Add new version section with changes
   ```

4. **Commit version bump**
   ```bash
   git add packages/rangelink-vscode-extension/package.json
   git add packages/rangelink-vscode-extension/CHANGELOG.md
   git commit -m "chore(vscode-ext): bump version to 0.1.1"
   ```

#### Phase 2: Build and Test

5. **Clean and rebuild**
   ```bash
   pnpm clean
   pnpm install
   pnpm -r compile
   pnpm -r test
   ```

6. **Package extension**
   ```bash
   cd packages/rangelink-vscode-extension
   pnpm package
   # Creates: rangelink-vscode-extension-0.1.1.vsix
   ```

7. **Test locally** (CRITICAL - don't skip!)
   ```bash
   pnpm install-local:vscode
   # Or: pnpm install-local:cursor
   # Verify extension loads and works correctly
   ```

#### Phase 3: Publish

8. **Publish to marketplace**
   ```bash
   cd packages/rangelink-vscode-extension
   pnpm publish
   # Or: vsce publish --no-dependencies
   ```

9. **Verify publication**
   - Wait 5-10 minutes
   - Visit: https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension
   - Verify version number updated
   - Test installation from marketplace

#### Phase 4: Tag and Release

10. **Create annotated git tag**
    ```bash
    git tag -a vscode-extension-v0.1.1 -m "Release vscode-extension v0.1.1

    Changes:
    - Fix ESLint configuration
    - Reorganize documentation
    - Update roadmap with post-publishing enhancements
    "
    ```

11. **Push tag to remote**
    ```bash
    git push origin vscode-extension-v0.1.1
    ```

12. **Create GitHub Release**
    - Go to: https://github.com/couimet/rangelink/releases/new
    - Select tag: `vscode-extension-v0.1.1`
    - Title: `VS Code Extension v0.1.1`
    - Description: Copy from CHANGELOG.md
    - Attach: `rangelink-vscode-extension-0.1.1.vsix`
    - Publish release

#### Phase 5: Post-Release

13. **Verify release**
    - Check GitHub release page
    - Test installing from marketplace
    - Verify tag appears in git log

14. **Update documentation** (if needed)
    - Update root README if announcing new features
    - Update roadmap to mark completed items

---

## Retroactive Tagging

### When You Forgot to Tag Before Publishing

If you've already published to the marketplace but forgot to create a git tag, follow this process to retroactively tag the release.

#### Step-by-Step: Retroactive Tag for v0.1.0

**Scenario:** You published `vscode-extension v0.1.0` from commit `ff52f9a` but didn't create a tag.

**Process:**

1. **Identify the exact commit**
   ```bash
   # You know the commit hash: ff52f9a6de904681e5fac7785c1b1f896040a42b
   git log --oneline -1 ff52f9a
   ```

2. **Verify the commit has the correct version**
   ```bash
   git show ff52f9a:packages/rangelink-vscode-extension/package.json | grep '"version"'
   # Should show: "version": "0.1.0"
   ```

3. **Create annotated tag on that commit**
   ```bash
   git tag -a vscode-extension-v0.1.0 ff52f9a -m "Release vscode-extension v0.1.0

   Initial release to VS Code Marketplace

   Features:
   - Link generation (relative/absolute paths)
   - GitHub-style notation (#L10-L25)
   - Rectangular selection support (##)
   - BYOD portable links
   - Custom delimiter configuration
   - Validation and error handling
   - Status bar feedback
   - Command palette integration
   - Context menu integration
   "
   ```

4. **Verify tag was created correctly**
   ```bash
   git tag -l "vscode-extension-v*"
   git show vscode-extension-v0.1.0 --stat
   ```

5. **Push tag to remote**
   ```bash
   git push origin vscode-extension-v0.1.0
   ```

6. **Create GitHub Release retroactively**
   - Go to: https://github.com/couimet/rangelink/releases/new
   - Select tag: `vscode-extension-v0.1.0`
   - Title: `VS Code Extension v0.1.0`
   - Description:
     ```markdown
     Initial release of RangeLink VS Code Extension

     ## Features

     - **Link Generation** - Create shareable links to code ranges
     - **GitHub-Style Notation** - Familiar #L10-L25 format
     - **Rectangular Selection** - Column selection support with ##
     - **BYOD (Portable Links)** - Links that work across different delimiter configs
     - **Custom Delimiters** - Configure notation to match your preferences
     - **Validation** - Comprehensive error handling and recovery
     - **Commands & Keybindings** - Cmd+R Cmd+L / Ctrl+R Ctrl+L

     ## Installation

     Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)

     ## What's Next

     See [ROADMAP.md](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md) for upcoming features.
     ```
   - Check "This is a pre-release" if applicable (NO for 0.1.0)
   - Publish release

7. **Verify everything**
   ```bash
   # Check tag exists locally and remotely
   git tag -l "vscode-extension-v*"
   git ls-remote --tags origin | grep vscode-extension

   # Verify GitHub release page
   # Visit: https://github.com/couimet/rangelink/releases
   ```

---

## GitHub Releases

### Release Naming Convention

- **Title:** `{Package Display Name} v{version}`
- **Examples:**
  - `VS Code Extension v0.1.0`
  - `Core Library v1.0.0`

### Release Description Template

```markdown
{Brief introduction - what's notable about this release}

## Features

- Feature 1
- Feature 2

## Bug Fixes

- Fix 1
- Fix 2

## Documentation

- Doc update 1

## Installation

{Package-specific installation instructions}

## What's Next

See [ROADMAP.md](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md) for upcoming features.
```

### Attaching Assets

Always attach the built package to GitHub releases:

- **VS Code Extension:** `rangelink-vscode-extension-{version}.vsix`
- **Core Library:** Not needed (published to npm)

### Pre-releases vs. Stable

- **Pre-release** (alpha/beta/rc): Check "This is a pre-release"
- **Stable release** (1.0.0+): Regular release
- **Early versions** (0.x.x): Use judgment - 0.1.0 can be stable

---

## Examples

### Example 1: First Release (v0.1.0) - Retroactive

```bash
# Already published to marketplace, now tagging retroactively
git tag -a vscode-extension-v0.1.0 ff52f9a -m "Release vscode-extension v0.1.0"
git push origin vscode-extension-v0.1.0
# Then create GitHub release manually
```

### Example 2: Second Release (v0.1.1)

```bash
# 1. Update version in package.json to 0.1.1
# 2. Update CHANGELOG.md
git add packages/rangelink-vscode-extension/package.json
git add packages/rangelink-vscode-extension/CHANGELOG.md
git commit -m "chore(vscode-ext): bump version to 0.1.1"

# 3. Build, test, package
pnpm clean && pnpm install && pnpm -r compile && pnpm -r test
cd packages/rangelink-vscode-extension
pnpm package

# 4. Test locally
pnpm install-local:vscode

# 5. Publish to marketplace
pnpm publish

# 6. Tag and push
git tag -a vscode-extension-v0.1.1 -m "Release vscode-extension v0.1.1

Changes:
- Documentation improvements
- ESLint configuration fixes
"
git push origin vscode-extension-v0.1.1

# 7. Create GitHub release with CHANGELOG content
```

### Example 3: Major Version Bump (v1.0.0)

```bash
# When ready for 1.0.0 (stable API, feature-complete)
# Same process, but version becomes 1.0.0
git tag -a vscode-extension-v1.0.0 -m "Release vscode-extension v1.0.0

First stable release with complete feature set and stable API.
"
```

### Example 4: Multiple Package Release

```bash
# If releasing both extension and core library
git tag -a core-ts-v1.0.0 -m "Release core-ts v1.0.0"
git tag -a vscode-extension-v0.5.0 -m "Release vscode-extension v0.5.0"
git push origin core-ts-v1.0.0
git push origin vscode-extension-v0.5.0
# Create separate GitHub releases for each
```

---

## Listing and Filtering Tags

### View all tags for a package

```bash
# VS Code extension tags only
git tag -l "vscode-extension-v*"

# Core library tags only
git tag -l "core-ts-v*"

# All tags
git tag -l
```

### View tag with commit info

```bash
git show vscode-extension-v0.1.0
git log --oneline --decorate --all
```

### Delete a tag (if needed)

```bash
# Delete locally
git tag -d vscode-extension-v0.1.0

# Delete remotely
git push origin :refs/tags/vscode-extension-v0.1.0
```

---

## Future Enhancements

These items are planned but not yet implemented:

- [ ] **Automated tagging via GitHub Actions**
  - Trigger on `chore: bump version` commits
  - Auto-create tags and GitHub releases
  - Extract CHANGELOG content automatically

- [ ] **Changesets integration**
  - More sophisticated version management
  - Automated CHANGELOG generation
  - Better monorepo version coordination

- [ ] **Pre-commit hooks**
  - Enforce clean working tree before tagging
  - Validate version numbers match across package.json and CHANGELOG
  - Prevent accidental dirty releases

- [ ] **Release verification scripts**
  - Automated checks before publishing
  - Version number validation
  - CHANGELOG completeness check

---

## Related Documentation

- [PUBLISHING.md](../PUBLISHING.md) - Publishing workflows for all packages
- [packages/rangelink-vscode-extension/PUBLISHING.md](../packages/rangelink-vscode-extension/PUBLISHING.md) - Extension-specific publishing
- [CHANGELOG.md](../CHANGELOG.md) - Root changelog
- [packages/rangelink-vscode-extension/CHANGELOG.md](../packages/rangelink-vscode-extension/CHANGELOG.md) - Extension changelog
- [ROADMAP.md](./ROADMAP.md) - Development roadmap

---

## Quick Reference

### Tag v0.1.0 Retroactively

```bash
git tag -a vscode-extension-v0.1.0 ff52f9a -m "Release vscode-extension v0.1.0"
git push origin vscode-extension-v0.1.0
```

### Release v0.1.1 (Full Process)

```bash
# 1. Version bump
cd packages/rangelink-vscode-extension
# Edit package.json: "version": "0.1.1"
# Edit CHANGELOG.md
git add package.json CHANGELOG.md
git commit -m "chore(vscode-ext): bump version to 0.1.1"

# 2. Build and test
cd ../..
pnpm clean && pnpm install && pnpm -r compile && pnpm -r test

# 3. Package and test locally
cd packages/rangelink-vscode-extension
pnpm package
pnpm install-local:vscode

# 4. Publish
pnpm publish

# 5. Tag and release
cd ../..
git tag -a vscode-extension-v0.1.1 -m "Release vscode-extension v0.1.1"
git push origin vscode-extension-v0.1.1
# Then create GitHub release
```

---

**Last Updated:** 2025-11-02
**Status:** Active - Manual release process in use
