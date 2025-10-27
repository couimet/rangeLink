# Development Guide

Quick start guide for developing RangeLink.

## Getting Started (2 Minutes)

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Start watch mode (auto-compile on changes)
npm run watch
```

Then:

1. Press `F5` to open a new Extension Development Host window
2. Open any file in the new window
3. Select some text
4. Press `Ctrl+K Ctrl+L` (or `Cmd+K Cmd+L` on Mac) to create a link
5. Check the status bar for "Linked: ..."

## Project Structure

```
rangelink/
├── src/
│   └── extension.ts      # Main extension code
├── out/                   # Compiled JavaScript (generated)
├── .vscode/              # VS Code config
│   ├── launch.json       # Debug configuration
│   └── tasks.json        # Build tasks
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── README.md             # User documentation
```

## Key Files

### `src/extension.ts`

- Main extension entry point
- Contains `RangeLinkService` class
- Handles command registration
- Formats code references

### `package.json`

- Extension metadata
- Command definitions
- Keyboard shortcuts
- Activation events

## Code Architecture

### RangeLinkService

Handles all extension logic:

- `createLink()` - Main command handler
- `formatLink()` - Smart formatting logic
- Status bar feedback

### Activation

Extension activates immediately when loaded (no lazy activation needed).

## Debugging

1. Set breakpoints in `src/extension.ts`
2. Press `F5` to launch Extension Development Host
3. Test your changes in the new window
4. Debugger will pause at breakpoints

## Making Changes

1. Edit `src/extension.ts`
2. Run `npm run compile` (or keep watch mode running)
3. In the Extension Development Host: `Ctrl+R` to reload the extension
4. Test your changes

## Testing Checklist

- [ ] Empty selection (cursor position only)
- [ ] Single line selection
- [ ] Multi-line selection
- [ ] Selection with specific columns
- [ ] Workspace with multiple folders
- [ ] Single file workspace
- [ ] No active workspace

## Next Features to Build

1. **Goto Reference**: Click on a reference to jump to it
2. **Reference Highlights**: Visual highlights in editor
3. **Reference Storage**: Save/bookmark references
4. **Terminal Integration**: Capture terminal output ranges
5. **Export/Import**: Share reference collections

## Package for Testing

```bash
npm install -g @vscode/vsce
vsce package
```

Install the generated `.vsix` file in a regular VS Code instance.
