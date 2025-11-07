# Publishing RangeLink VS Code Extension

> **Note:** This guide covers publishing the RangeLink VS Code extension specifically. For an overview of all publishable packages in this monorepo, see the [root PUBLISHING.md](../../PUBLISHING.md).

Guide for publishing the RangeLink VS Code extension to the marketplace.

> **📋 For complete release workflow details**, including version management, git tagging, and GitHub releases, see the [Release Strategy](../../docs/RELEASE-STRATEGY.md) documentation.

## Development and Testing

**Before publishing**, you should thoroughly test your changes locally. See [DEVELOPMENT.md](./DEVELOPMENT.md) for complete instructions on:

- Extension Development Host workflow (F5 debugging)
- Local installation for end-to-end testing
- Building and packaging the extension
- Testing strategies and checklists

**Quick reference:**

```bash
# From project root

# 1) Setup the project (first time only)
./setup.sh

# 2) Develop with live reload (F5 in VS Code)
# See DEVELOPMENT.md for detailed workflow

# 3) Test locally before publishing
pnpm package:vscode-extension
pnpm install-local:vscode-extension:both
```

## Submitting Your Changes

**For contributors:** Once you've tested your changes locally:

1. Ensure all tests pass: `pnpm test`
2. Commit your changes with a clear, descriptive message
3. Push to your fork and create a Pull Request
4. Maintainers will review, merge, and handle publishing to the marketplace

---

## Publishing to VS Code Marketplace

> **Note:** This section is for project maintainers only. Contributors should follow the "Submitting Your Changes" section above.

<details>
<summary><b>Prerequisites (Click to expand)</b></summary>

### Publisher Account Setup

You'll need a publisher account to publish to the VS Code Marketplace:

1. **Create/Login to Azure DevOps:**

   ```bash
   pnpx vsce login <publisher-name>
   ```

2. **Ensure you have a publisher account:**
   - Visit: <https://marketplace.visualstudio.com/manage>
   - Create a publisher if you don't have one
   - Update `package.json` with your publisher ID

</details>

## Publishing Workflow

### Quick Start

Publishing is **automated through a script** that generates version-specific, copy-paste ready instructions:

```bash
# 1. Build and test the VSIX package
pnpm package:vscode-extension
pnpm install-local:vscode-extension:vscode

# 2. Generate publishing instructions
pnpm generate:publish-instructions:vscode-extension
```

The script will:
- ✓ Validate VSIX exists
- ✓ Validate CHANGELOG.md is updated
- ✓ Validate git tag doesn't already exist
- ✓ Check working tree is clean
- ✓ Generate a markdown file with version-specific commands

**Output:** `publishing-instructions/publish-vscode-extension-v{VERSION}.md`

This file contains copy-paste ready commands for:
1. Creating git tags
2. Creating GitHub releases
3. Publishing to VS Code Marketplace
4. Publishing to Open-VSX Registry
5. Post-publishing verification

### Why This Approach?

✅ **Version-specific** - Instructions tailored to the exact version you're publishing
✅ **Validated** - Script checks prerequisites before generating instructions
✅ **Reproducible** - Generated instructions are committed for audit trail
✅ **Safe** - Validates clean working tree (or use `--allow-dirty` for testing)
✅ **Complete** - Covers all marketplaces (VS Code, Open-VSX) and GitHub releases

## Publishing to Cursor Marketplace

Cursor uses the VS Code marketplace, so publishing there automatically makes it available in Cursor.

However, if you want to publish separately:

1. Follow the same steps as VS Code
2. Use a different publisher name if desired

## Version Management & Release Workflow

For complete information on:

- Version management and semantic versioning
- Git tagging conventions
- Release workflow phases (prepare, build, test, publish, tag)
- GitHub release creation
- Retroactive tagging

See [RELEASE-STRATEGY.md](../../docs/RELEASE-STRATEGY.md#release-workflow) for detailed steps, including the pre-publishing checklist.

## Post-Publishing

After publishing:

1. Wait 5-10 minutes for the marketplace to update
2. Search for your extension by name
3. Verify it appears correctly
4. Test installing it in a clean VS Code instance
5. Visit: https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension

## Additional Resources

- [Extension Authoring Guide](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/Microsoft/vscode-vsce)
