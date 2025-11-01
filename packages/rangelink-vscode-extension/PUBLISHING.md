# Publishing RangeLink VS Code Extension

> **Note:** This guide covers publishing the RangeLink VS Code extension specifically. For an overview of all publishable packages in this monorepo, see the [root PUBLISHING.md](../../PUBLISHING.md).

Guide for building, testing, and publishing the RangeLink VS Code extension.

## Building the Extension

For complete local setup and testing instructions, please see `DEVELOPMENT.md`. In a nutshell, you can use the following commands **from the root of the project**:

```bash
# 1) Setup the project
./setup.sh

# 2) Package the extension
pnpm package:vscode-extension
```

## Testing the Extension Locally

### Quick Install (Recommended)

Use the provided scripts that automatically detect the version from `package.json`:

```bash
# Install in both VS Code and Cursor
pnpm install-local:vscode-extension:both

# Install only in Cursor
pnpm install-local:vscode-extension:cursor

# Install only in VS Code
pnpm install-local:vscode-extension:vscode
```

The scripts will:

- Auto-detect the version from `package.json` (works with changesets!)
- Build the extension if the `.vsix` file is missing
- Install in the specified editor(s)
- Provide helpful error messages if editor CLI is not found

### Manual Install

If you prefer to install manually:

> [!TIP]
> **Check your current version:**
>
> ```bash
> # From project root
> node -p "require('./packages/rangelink-vscode-extension/package.json').version"
>
> # Or with jq if installed
> jq -r '.version' packages/rangelink-vscode-extension/package.json
> ```
>
> Replace `0.1.0` in the commands below with your current version.

**VS Code:**

```bash
code --install-extension packages/rangelink-vscode-extension/rangelink-vscode-extension-0.1.0.vsix
```

**Cursor:**

```bash
cursor --install-extension packages/rangelink-vscode-extension/rangelink-vscode-extension-0.1.0.vsix
```

**Or use the UI (works in both VS Code and Cursor):**

- Open VS Code or Cursor
- Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
- Click the `...` menu (top-right of Extensions view)
- Choose "Install from VSIX..."
- Select the `.vsix` file from `packages/rangelink-vscode-extension/`

### Test the Functionality

- Open any file
- Select some text
- Press `Ctrl+R Ctrl+L` (or `Cmd+R Cmd+L` on Mac)
- Verify the link is copied to clipboard

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

### Publishing Steps

1. **Verify you're logged in:**

   ```bash
   vsce login <publisher-name>
   ```

2. **Publish the extension:**

   ```bash
   pnpm publish:vscode-extension
   ```

   This will:
   - Update the version in `package.json`
   - Create a git tag
   - Upload to the marketplace

## Publishing to Cursor Marketplace

Cursor uses the VS Code marketplace, so publishing there automatically makes it available in Cursor.

However, if you want to publish separately:

1. Follow the same steps as VS Code
2. Use a different publisher name if desired

## Version Management

vsce will automatically:

- Bump the version in `package.json`
- Prompt for a version message
- Create a git tag

To manually manage versions, edit `package.json`:

```json
"version": "0.1.0"
```

Follow semantic versioning (major.minor.patch).

## Troubleshooting

### Error: "Missing publisher"

Solution: Edit `package.json` and add:

```json
"publisher": "your-publisher-name"
```

### Error: "Missing repository URL"

Solution: Add repository info to `package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/couimet/rangelink.git"
}
```

### Error: "Extension validation failed"

Solution: Run with verbose flag to see details:

```bash
vsce package --verbose
```

## Checklist Before Publishing

- [ ] Code compiles without errors
- [ ] All commands are registered
- [ ] README is comprehensive
- [ ] CHANGELOG is updated
- [ ] License is included
- [ ] Icon/logo is added (optional but recommended)
- [ ] Extension is tested thoroughly
- [ ] Version number is appropriate

## Post-Publishing

After publishing:

1. Wait 5-10 minutes for the marketplace to update
2. Search for your extension by name
3. Verify it appears correctly
4. Test installing it in a clean VS Code instance

## Additional Resources

- [Extension Authoring Guide](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/Microsoft/vscode-vsce)
