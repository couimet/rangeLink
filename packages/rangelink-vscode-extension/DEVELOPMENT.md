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

| Feature              | Extension Dev Host (F5)    | Local Install Script         |
| -------------------- | -------------------------- | ---------------------------- |
| **Reload speed**     | ⚡ Instant (`Cmd+R`)       | 🐌 Slow (full window reload) |
| **Keeps terminals**  | ✅ Yes                     | ❌ No (window reload needed) |
| **Debugging**        | ✅ Full breakpoint support | ❌ No debugging              |
| **Auto-compile**     | ✅ Watch mode              | ⚠️ Manual rebuild needed     |
| **Test environment** | Separate window            | Your actual editor           |
| **Best for**         | Active development         | Final validation             |

**TL;DR:** Use F5 for development, use install script before publishing.

---

## Extension Development Host (Recommended for Active Development)

**Best for:** Active development, debugging, quick iterations

The Extension Development Host runs your extension in a separate Cursor/VSCode window with live debugging support. This is the **fastest way to develop** because you can reload with a single keypress without losing your terminal sessions.

### Setup (one-time)

1. Open the RangeLink monorepo in Cursor/VSCode
2. The `.vscode/launch.json` is already configured

### Development Workflow

1. **Start the watch task** (once per session):
   - Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Tasks: Run Task" and select it
   - Choose "Watch: All"
   - This builds core, regenerates `version.json`, then starts TypeScript watch for both packages
   - The watch task runs independently and survives debug restarts
   - **Important:** If restarting, kill existing watch tasks first (Terminal > Terminate Task)

2. **Press `F5`** (or Run > Start Debugging)
   - This opens a new "[Extension Development Host]" window with a **clean temporary profile**
   - Your extension is loaded and ready to test (no conflicts with installed extensions)
   - No preLaunchTask delay since watch is already running

4. **View extension logs** (important for debugging):
   - Open the Output panel in the Extension Development Host window
   - Quick access: `Cmd+Shift+U` (Mac) or `Ctrl+Shift+U` (Windows/Linux)
   - Or via Command Palette: "View: Toggle Output" (`Cmd+Shift+P` → type "output")
   - Select "RangeLink" from the dropdown in the Output panel
   - All extension logs (INFO, WARN, ERROR) appear here with structured formatting

5. **Make code changes** in your main window
   - Files are auto-compiled by the watch task
   - Changes are ready immediately

6. **Reload to see changes:** Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux) in the Extension Development Host window
   - This reloads ONLY the dev host window
   - Your main window and terminals stay intact
   - Much faster than full window reload

7. **Debug with breakpoints:**
   - Set breakpoints in your TypeScript code
   - They'll hit when you trigger commands in the dev host
   - Inspect variables, step through code, etc.

8. **Stop/restart debugging freely:**
   - The watch task keeps running independently
   - Press `Shift+F5` to stop, `F5` to restart
   - No need to restart the watch task

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

## Build Output Structure

Understanding the build output structure helps prevent common issues and explains why we use separate directories for development vs production builds.

### Directory Overview

RangeLink follows the official VSCode extension convention of separating development and production builds:

```text
packages/rangelink-vscode-extension/
├── src/              # TypeScript source files
├── out/              # Development build (tsc output)
│   ├── extension.js  # Individual unbundled files
│   ├── *.js          # One file per source file
│   └── version.json  # Runtime version info (required)
└── dist/             # Production build (esbuild output)
    ├── extension.js  # Single bundled file (~88KB)
    └── version.json  # Runtime version info (bundled inline)
```

### Development Build: `out/` Directory

**Generated by:** TypeScript compiler (`tsc`)

**Used for:** F5 debugging, Extension Development Host

**Build command:** `pnpm watch` (continuous) or manual `tsc`

**Characteristics:**

- ✅ **Individual files** - One `.js` file per `.ts` source file
- ✅ **Unbundled** - Imports are not resolved (uses `require()` at runtime)
- ✅ **Fast compilation** - Quick incremental rebuilds
- ✅ **Debuggable** - Source maps map directly to TypeScript files
- ⚠️ **Not packaged** - Excluded from `.vsix` via `.vscodeignore`

**When it's used:**

- Press F5 → VSCode's Extension Development Host loads `out/extension.js`
- `launch.json` points to `out/**/*.js` for debugging
- `tsc --watch` continuously updates `out/` as you edit files

### Production Build: `dist/` Directory

**Generated by:** esbuild bundler

**Used for:** Packaging, marketplace distribution

**Build command:** `pnpm compile` or `pnpm package` (includes compilation)

**Characteristics:**

- ✅ **Single bundle** - All code + dependencies in one file
- ✅ **Bundled dependencies** - `rangelink-core-ts` included inline
- ✅ **Optimized** - Minified, tree-shaken for smaller size
- ✅ **Production-ready** - What users download from marketplace
- ✅ **Packaged** - Included in `.vsix` file

**When it's used:**

- `pnpm package` → Creates `.vsix` containing `dist/extension.js`
- `package.json` main field points to `./dist/extension.js`
- Users download and install the extension from marketplace

### Why Two Directories?

**Problem we solve:**

Before this separation, both `tsc` and `esbuild` wrote to the same `out/` directory. This caused conflicts:

1. Developer runs `pnpm compile` (esbuild creates bundled `out/extension.js`)
2. Developer presses F5 (launches `tsc --watch` in background)
3. `tsc` overwrites `out/extension.js` with unbundled version
4. Developer runs `pnpm package` → packages unbundled files
5. Extension fails at runtime: `Error: Cannot find module 'rangelink-core-ts'`

**Solution:**

By following VSCode convention (`out/` for dev, `dist/` for prod):

- ✅ **No conflicts** - Two build systems never overwrite each other
- ✅ **Clear intent** - Directory name indicates purpose
- ✅ **Standard convention** - Matches official VSCode extension templates
- ✅ **Simpler** - No validation scripts needed to detect bad builds

### The `version.json` File

The extension displays version info via "RangeLink: Show Version Info" command. This requires `version.json` at runtime:

```typescript
// src/extension.ts
const versionInfo = require('./version.json'); // Resolves relative to .js file
```

**Why it's in both directories:**

| Directory | Purpose               | How it's used                                                  |
| --------- | --------------------- | -------------------------------------------------------------- |
| **out/**  | Development debugging | `out/extension.js` requires `out/version.json` (separate file) |
| **dist/** | Production bundle     | esbuild bundles content inline (file redundant but harmless)   |

The `compile` script ensures both exist:

```bash
# packages/rangelink-vscode-extension/package.json
"compile": "... && cp src/version.json dist/version.json && mkdir -p out && cp src/version.json out/version.json"
```

**Why this matters:**

- Without `out/version.json` → F5 debugging breaks (missing file error)
- Without `dist/version.json` → Still works (bundled inline) but inconsistent

**When it's regenerated:**

The watch task regenerates `version.json` **once at startup** (via the "Generate version.json" dependency). During a dev session, it stays the same since `tsc --watch` only recompiles `.ts` files.

- Start watch task → `version.json` regenerated with current git commit hash
- During dev session → version.json unchanged
- Restart watch → regenerated with new git hash

This is correct for typical workflows since the commit hash doesn't change during a session. If you make new commits and want the updated hash in "RangeLink: Show Version Info", restart the watch task.

**Manual regeneration:**

```bash
# For development (copies to out/ only)
pnpm --filter rangelink-vscode-extension generate-version

# For production build (copies to out/ and dist/)
pnpm --filter rangelink-vscode-extension generate-version:all
```

The script outputs all version metadata and logs when it deletes existing files.

### What Gets Packaged?

When you run `pnpm package`, the `.vscodeignore` file controls what's included:

**Included in `.vsix`:**

- ✅ `dist/extension.js` (single 88KB bundle)
- ✅ `dist/version.json` (234 bytes)
- ✅ `package.json`, `README.md`, `LICENSE.txt`, `icon.png`

**Excluded from `.vsix`:**

- ❌ `out/**` (development files)
- ❌ `src/**` (TypeScript source)
- ❌ `node_modules/**` (dependencies bundled in dist/)
- ❌ Test files, scripts, coverage reports

You can verify with:

```bash
pnpm package
# Look for "Files included in the VSIX:" output
# Should show dist/extension.js, NOT out/extension.js
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
   const disposable = vscode.commands.registerCommand('rangelink.myNewCommand', myNewCommand);
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
2. Verify compilation succeeded: check `out/` directory exists with files
3. Reload Extension Development Host: `Cmd+R` / `Ctrl+R`

> See [Build Output Structure](#build-output-structure) section for understanding `out/` vs `dist/` directories.

**Changes not appearing:**

1. Ensure watch task is running (see [Development Workflow](#development-workflow) step 1)
2. Check for TypeScript compilation errors in the watch terminal
3. Reload the Extension Development Host window (`Cmd+R` / `Ctrl+R`)

**Debugger won't start (F5 hangs or fails):**

1. Check for orphaned watch processes: `ps aux | grep rangelink`
2. Kill them if found: `pkill -f "rangelink.*watch"; pkill -f "rangelink.*tsc"`
3. Try F5 again

**Breakpoints not hitting:**

1. Verify you're running in debug mode (F5)
2. Check that source maps are generated
3. Ensure breakpoint is in executed code path

**"Cannot find module" errors:**

1. **In development (F5):** Check `out/` directory has compiled files
2. **In packaged extension:** See [Build Output Structure](#build-output-structure) section

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
