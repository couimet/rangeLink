# Developing RangeLink VS Code Extension

> **Note:** This guide covers development of the RangeLink VS Code extension specifically. For general monorepo setup and workspace-wide commands, see the [root DEVELOPMENT.md](../../DEVELOPMENT.md).

Guide for building, testing, and developing the RangeLink VS Code extension.

## Prerequisites

Before starting extension development, ensure you've completed the general project setup:

```bash
# From project root
./setup.sh
```

See [root DEVELOPMENT.md](../../DEVELOPMENT.md) for detailed setup instructions.

## Extension Development Approaches

### Quick Comparison

| Feature | Extension Dev Host (F5) | Local Install Script |
|---------|-------------------------|----------------------|
| **Reload speed** | ⚡ Instant (`Cmd+R`) | 🐌 Slow (full window reload) |
| **Keeps terminals** | ✅ Yes | ❌ No (window reload needed) |
| **Debugging** | ✅ Full breakpoint support | ❌ No debugging |
| **Auto-compile** | ✅ Watch mode | ⚠️ Manual rebuild needed |
| **Test environment** | Separate window | Your actual editor |
| **Best for** | Active development | Final validation |

**TL;DR:** Use F5 for development, use install script before publishing.

---

## Extension Development Host (Recommended for Active Development)

**Best for:** Active development, debugging, quick iterations

The Extension Development Host runs your extension in a separate Cursor/VSCode window with live debugging support. This is the **fastest way to develop** because you can reload with a single keypress without losing your terminal sessions.

### Setup (one-time)

1. Open the RangeLink monorepo in Cursor/VSCode
2. The `.vscode/launch.json` is already configured

### Development Workflow

1. Press `F5` (or Run > Start Debugging)
   - This opens a new "[Extension Development Host]" window
   - Your extension is loaded and ready to test
   - TypeScript watch mode auto-compiles on file changes

2. **View extension logs** (important for debugging):
   - Open the Output panel in the Extension Development Host window
   - Quick access: `Cmd+Shift+U` (Mac) or `Ctrl+Shift+U` (Windows/Linux)
   - Or via Command Palette: "View: Toggle Output" (`Cmd+Shift+P` → type "output")
   - Select "RangeLink" from the dropdown in the Output panel
   - All extension logs (INFO, WARN, ERROR) appear here with structured formatting

3. Make code changes in your main window
   - Files are auto-compiled by the watch task
   - Changes are ready immediately

4. **Reload to see changes:** Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux) in the Extension Development Host window
   - This reloads ONLY the dev host window
   - Your main window and terminals stay intact
   - Much faster than full window reload

5. **Debug with breakpoints:**
   - Set breakpoints in your TypeScript code
   - They'll hit when you trigger commands in the dev host
   - Inspect variables, step through code, etc.

### Advantages

- ✅ Instant reload (`Cmd+R`) without losing terminals
- ✅ Full debugging support (breakpoints, call stack, variables)
- ✅ Auto-compilation on file changes
- ✅ Isolated from your main editor installation
- ✅ Perfect for rapid iteration

### Limitations

- ⚠️ Testing happens in a separate window
- ⚠️ Can't test integration with your real workflow/extensions

---

## Local Installation (For End-to-End Testing)

**Best for:** Final validation, dogfooding, testing with your real workflow

Use this when you want to test the extension in your actual Cursor/VSCode instance with all your other extensions and settings. This is the "real world" test before publishing.

### Quick Install with Scripts

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
- Display version and commit hash information after installation
- Provide helpful error messages if editor CLI is not found

> [!IMPORTANT]
> **After installation, you MUST reload your editor** for the extension to work properly:
>
> - Use Command Palette → "Developer: Reload Window"
>
> You can verify the installation by running "RangeLink: Show Version Info" from the Command Palette.

### Manual Installation

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
- **Reload the window** after installation (see note above)

---

## Building the Extension

### Standard Build

```bash
# From project root
pnpm package:vscode-extension
```

This creates a `.vsix` file in `packages/rangelink-vscode-extension/`.

### Watch Mode for Development

```bash
# From project root (runs watch for both core and extension)
pnpm watch

# Or watch extension only
cd packages/rangelink-vscode-extension
pnpm watch
```

Watch mode automatically recompiles TypeScript on file changes. Use this with the Extension Development Host for the fastest iteration cycle.

### Clean Build

```bash
# Clean all build artifacts
pnpm clean

# Or clean extension only
cd packages/rangelink-vscode-extension
pnpm clean
```

---

## Testing the Extension

### Functional Testing

After installing (via either method above), test the core functionality:

- Open any file
- Select some text
- Press `Ctrl+R Ctrl+L` (or `Cmd+R Cmd+L` on Mac)
- Verify the link is copied to clipboard

### Extension-Specific Test Suite

```bash
# Run extension tests
cd packages/rangelink-vscode-extension
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Manual Testing Checklist

See [root DEVELOPMENT.md](../../DEVELOPMENT.md#testing-checklist) for the comprehensive testing checklist covering:
- Empty selections
- Single/multi-line selections
- Rectangular selections
- Workspace configurations
- Custom delimiters

---

## Extension Architecture

### Key Files

**Extension Entry Point** (`src/extension.ts`):
- Registers commands
- Loads configuration
- Creates output channel logger

**Command Handlers** (`src/commands/`):
- `copyLinkCommand.ts` - Standard link commands
- `copyPortableLinkCommand.ts` - Portable link commands

**Configuration** (`src/config/`):
- `loadConfig.ts` - Load and validate configuration
- Adapts VSCode settings to core library types

### Adding a New Command

1. Define command in `package.json`:
   ```json
   {
     "command": "rangelink.myNewCommand",
     "title": "My New Command",
     "category": "RangeLink"
   }
   ```

2. Add keybinding in `package.json`:
   ```json
   {
     "command": "rangelink.myNewCommand",
     "key": "ctrl+r ctrl+n",
     "mac": "cmd+r cmd+n"
   }
   ```

3. Implement handler in `src/commands/`:
   ```typescript
   export function myNewCommand(context: vscode.ExtensionContext): void {
     // Implementation
   }
   ```

4. Register in `src/extension.ts`:
   ```typescript
   const disposable = vscode.commands.registerCommand(
     'rangelink.myNewCommand',
     myNewCommand
   );
   context.subscriptions.push(disposable);
   ```

---

## Debugging Tips

### Viewing Extension Logs

In the Extension Development Host:
1. Open Output panel: `Cmd+Shift+U` (Mac) or `Ctrl+Shift+U` (Windows/Linux)
2. Select "RangeLink" from the dropdown
3. View structured logs with error codes

### Common Issues

**Extension not loading:**
1. Check Output panel → "Extension Host" for errors
2. Verify compilation succeeded: check `out/` directory
3. Reload Extension Development Host: `Cmd+R` / `Ctrl+R`

**Changes not appearing:**
1. Ensure watch mode is running: `pnpm watch`
2. Check for TypeScript compilation errors
3. Reload the Extension Development Host window

**Breakpoints not hitting:**
1. Verify you're running in debug mode (F5)
2. Check that source maps are generated
3. Ensure breakpoint is in executed code path

---

## Publishing

Once you've tested your changes locally, see [PUBLISHING.md](./PUBLISHING.md) for:
- Submitting changes (contributors)
- Publishing to marketplace (maintainers)

---

## Additional Resources

### Project Documentation

- [Root DEVELOPMENT.md](../../DEVELOPMENT.md) - Monorepo-wide development
- [PUBLISHING.md](./PUBLISHING.md) - Publishing this extension
- [Architecture](../../docs/ARCHITECTURE.md) - System design
- [Roadmap](../../docs/ROADMAP.md) - Planned features

### VS Code Resources

- [Extension Authoring Guide](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
