# Publishing RangeLink Extension

This guide explains how to build and publish the RangeLink extension to the VS Code and Cursor marketplaces.

## Prerequisites

1. Install `vsce` (Visual Studio Code Extension manager):

```bash
npm install -g @vscode/vsce
```

2. Create/Login to Azure DevOps (required for publishing to VS Code marketplace):

```bash
vsce login <publisher-name>
```

3. Ensure you have a publisher account set up:
   - Visit: https://marketplace.visualstudio.com/manage
   - Create a publisher if you don't have one

## Building the Extension

1. Install dependencies:

```bash
npm install
```

2. Compile TypeScript:

```bash
npm run compile
```

3. Package the extension:

```bash
vsce package
```

This creates a `.vsix` file (e.g., `rangelink-0.1.0.vsix`).

## Testing the Extension Locally

1. Install the extension locally:

```bash
code --install-extension rangelink-0.1.0.vsix
```

2. Or use the VS Code UI:

   - Open VS Code
   - Go to Extensions view
   - Click the `...` menu
   - Choose "Install from VSIX..."
   - Select your `.vsix` file

3. Test the functionality:
   - Open any file
   - Select some text
   - Press `Ctrl+K Ctrl+L` (or `Cmd+K Cmd+L` on Mac)
   - Verify the link is copied to clipboard

## Publishing to VS Code Marketplace

1. Make sure you're logged in:

```bash
vsce login <publisher-name>
```

2. Publish the extension:

```bash
vsce publish
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
