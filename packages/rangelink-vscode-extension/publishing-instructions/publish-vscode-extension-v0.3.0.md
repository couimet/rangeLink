# ⚠️ Publishing Instructions - ERROR

## ❌ Cannot Generate Publishing Instructions

**Error:** VSIX file not found: `rangelink-vscode-extension-0.3.0.vsix`

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

1. **Build the VSIX package:**

   ```bash
   pnpm package:vscode-extension
   ```

2. **Test the extension locally:**

   ```bash
   pnpm install-local:vscode-extension:vscode
   ```

3. **Regenerate publishing instructions:**

   ```bash
   pnpm generate:publish-instructions:vscode-extension
   ```

---

**Generated:** 2025-11-07 16:24:19 UTC
