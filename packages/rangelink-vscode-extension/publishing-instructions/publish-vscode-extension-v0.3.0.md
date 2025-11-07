# ⚠️ Publishing Instructions - ERROR

## ❌ Cannot Generate Publishing Instructions

**Error:** No section found for version [0.3.0] in CHANGELOG.md (expected: ## [0.3.0])

---

## ⚠️ WARNING: TESTING MODE

**This file was generated with `--allow-dirty` flag.**

The working tree contains uncommitted changes. These instructions are for **TESTING ONLY**.

**DO NOT publish to production marketplaces from a dirty working tree.**

For production releases:
1. Commit or stash all changes
2. Rebuild with clean working tree: `pnpm package:vscode-extension`
3. Regenerate instructions: `pnpm generate:publish-instructions:vscode-extension`

---

### Resolution Steps:

1. **Add version section to CHANGELOG.md:**

   ```markdown
   ## [0.3.0]

   ### Added
   - New feature 1
   - New feature 2

   ### Fixed
   - Bug fix 1
   ```

2. **Add reference link at bottom of CHANGELOG.md:**

   ```markdown
   [0.3.0]: https://github.com/couimet/rangelink/compare/vscode-extension-vPREV...vscode-extension-v0.3.0
   ```

   Replace `vPREV` with the previous version (e.g., v0.2.1).

3. **Commit changes:**

4. **Regenerate instructions:**

   ```bash
   pnpm generate:publish-instructions:vscode-extension
   ```

### Why This Matters

The CHANGELOG documents all changes for each release. Marketplace listings and GitHub
releases reference this file. Complete changelogs help users understand what changed
and decide whether to upgrade.

---

**Generated:** 2025-11-07 15:31:46 UTC
