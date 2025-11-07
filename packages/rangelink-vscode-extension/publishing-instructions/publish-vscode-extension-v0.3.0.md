# Publishing Instructions: RangeLink VS Code Extension v0.3.0

**Generated:** 2025-11-07 15:15:06 UTC

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

This file contains version-specific, copy-paste ready commands for publishing
the RangeLink VS Code extension to marketplaces and creating releases.

---

## ✅ Prerequisites Checklist

Before proceeding, ensure:

- [ ] Version updated in `package.json` to `0.3.0`
- [ ] `CHANGELOG.md` updated with release notes for v0.3.0
- [ ] All tests passing (`pnpm test`)
- [ ] Working tree is clean (no uncommitted changes)
- [ ] VSIX file built and tested locally

---

## Phase 1: Prepare Environment

Run from **monorepo root**:

```bash
pnpm package:prepare
```

This command:
- Runs `clean:all` (removes all build artifacts, node_modules, *.vsix files)
- Reinstalls dependencies (`pnpm install`)

---

## Phase 2: Build and Package

### Build VSIX Package

Run from **monorepo root**:

```bash
pnpm package:vscode-extension
```

This creates: `packages/rangelink-vscode-extension/rangelink-vscode-extension-0.3.0.vsix`

### Verify VSIX Created

```bash
ls -lh packages/rangelink-vscode-extension/rangelink-vscode-extension-0.3.0.vsix
```

---

## Phase 3: Local Testing (CRITICAL)

### Install in VS Code

Run from **monorepo root**:

```bash
pnpm install-local:vscode-extension:vscode
```

### Install in Cursor (Optional)

```bash
pnpm install-local:vscode-extension:cursor
```

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Copy Range Link command works (`Cmd+R Cmd+L` / `Ctrl+R Ctrl+L`)
- [ ] Copy Range Link (Absolute) works
- [ ] Copy Portable RangeLink commands work
- [ ] Context menu items appear on selection
- [ ] Status bar shows success messages
- [ ] Check output channel for errors (`Cmd+Shift+U`, select "RangeLink")

---

## Phase 4: Publish to VS Code Marketplace

### Ensure Logged In

```bash
pnpx vsce login couimet
```

**Note:** If this is your first time, create a Personal Access Token (PAT) at:
https://dev.azure.com/${YOUR_ORG}/_usersSettings/tokens

### Publish

Run from **monorepo root**:

```bash
pnpm publish:vscode-extension:vsix
```

### Verify Publication

Wait 5-10 minutes, then visit:
https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension

Check:
- [ ] Version number shows `0.3.0`
- [ ] Extension installs correctly from marketplace
- [ ] README displays properly

---

## Phase 5: Publish to Open-VSX Registry

### Login (First Time Setup)

If you haven't already:

1. Create Eclipse account and sign Publisher Agreement:
   https://open-vsx.org/

2. Generate Access Token:
   https://open-vsx.org/user-settings/tokens

3. Create namespace (first time only):
   ```bash
   pnpx ovsx create-namespace couimet --pat <YOUR_TOKEN>
   ```

### Publish to Open-VSX

```bash
cd packages/rangelink-vscode-extension
pnpx ovsx publish rangelink-vscode-extension-0.3.0.vsix --pat <YOUR_TOKEN>
cd ../..
```

**Token reminder:** If session expired, regenerate at https://open-vsx.org/user-settings/tokens

### Verify Publication

Visit: https://open-vsx.org/extension/couimet/rangelink-vscode-extension

Check:
- [ ] Version shows `0.3.0`
- [ ] Extension details display correctly

---

## Phase 6: Create Git Tag

### Tag the Release

Run from **monorepo root**:

```bash
git tag -a vscode-extension-v0.3.0 -m "Release vscode-extension v0.3.0

Changes:
- [Copy key changes from CHANGELOG.md]
"
```

### Push Tag

```bash
git push origin vscode-extension-v0.3.0
```

### Verify Tag

```bash
git tag -l "vscode-extension-v*"
git show vscode-extension-v0.3.0 --stat
```

---

## Phase 7: Create GitHub Release

### Navigate to GitHub Releases

Open: https://github.com/couimet/rangelink/releases/new?tag=vscode-extension-v0.3.0

### Fill Release Form

- **Tag:** `vscode-extension-v0.3.0` (should auto-populate)
- **Title:** `VS Code Extension v0.3.0`
- **Description:** Copy from `CHANGELOG.md` for v0.3.0
- **Attach file:** `packages/rangelink-vscode-extension/rangelink-vscode-extension-0.3.0.vsix`
- **Pre-release:** Check only if this is alpha/beta/rc

### Publish Release

Click "Publish release"

### Verify Release

- [ ] Release appears at: https://github.com/couimet/rangelink/releases
- [ ] VSIX file is attached and downloadable
- [ ] Tag shows correct commit

---

## Phase 8: Post-Publishing Verification

### Check All Marketplaces

- [ ] VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension
- [ ] Open-VSX: https://open-vsx.org/extension/couimet/rangelink-vscode-extension
- [ ] GitHub Release: https://github.com/couimet/rangelink/releases/tag/vscode-extension-v0.3.0

### Install from Marketplace

Test clean installation in fresh VS Code instance:

```bash
code --install-extension couimet.rangelink-vscode-extension
```

### Update Documentation (If Needed)

- [ ] Update root README.md if announcing new features
- [ ] Update `docs/ROADMAP.md` to mark completed items
- [ ] Move completed work to `docs/JOURNEY.md` if applicable

---

## Troubleshooting

### "Extension not found" Error

- Wait 10-15 minutes for marketplace indexing
- Clear VS Code cache: `rm -rf ~/.vscode/extensions/couimet.rangelink-vscode-extension-*`
- Restart VS Code

### "Tag already exists" Error

See error resolution steps in script output.

### "Authentication failed" Error

Regenerate Personal Access Token and login again with `pnpx vsce login`

---

**Next Steps After Publishing:**

1. Monitor marketplace for install counts and ratings
2. Watch GitHub issues for bug reports
3. Plan next release based on roadmap

---

**Generated by:** `packages/rangelink-vscode-extension/scripts/generate-publishing-instructions.sh`
**Date:** 2025-11-07 15:15:06 UTC
