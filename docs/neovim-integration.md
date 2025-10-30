# Neovim Integration Guide

This document outlines practical ways to use `rangelink-core-ts` from a Neovim plugin (Lua), without rewriting the core in another language.

Neovim plugins are typically written in Lua (or Vimscript). They cannot directly `require()` an npm package, but there are reliable integration options:

## Options

### 1) Lua plugin + Node CLI (recommended to start)

- Wrap `rangelink-core-ts` in a small CLI: stdin JSON → stdout JSON
- Neovim calls it via `jobstart()` / `vim.system()`
- Pros: simple, robust, no long‑running process; easy to debug
- Cons: per-call process startup overhead (usually fine)

Example CLI contract (Node side):

- Input (stdin):

```json
{
  "action": "build",
  "path": "src/file.ts",
  "selections": [
    { "line": 10, "startChar": 5, "endChar": 10 },
    { "line": 11, "startChar": 5, "endChar": 10 }
  ],
  "config": {
    "delimiterLine": "L",
    "delimiterPosition": "C",
    "delimiterHash": "#",
    "delimiterRange": "-"
  }
}
```

- Output (stdout):

```json
{ "link": "src/file.ts##L11C6-L12C11", "isColumnMode": true }
```

### 2) Lua plugin + local HTTP server

- Start a tiny Node server that exposes build/parse endpoints
- Lua calls `http://localhost:PORT/...`
- Pros: lower startup cost for repeated calls
- Cons: lifecycle management (start/stop, port conflicts)

### 3) coc.nvim extension (Node-based)

- If your team uses coc.nvim, ship a coc extension that depends on `rangelink-core-ts` directly
- Pros: native Node environment; easy npm reuse
- Cons: ties usage to coc.nvim specifically

### 4) Native core in another language (longer-term)

- Keep TypeScript as reference implementation (spec-first)
- Add a native core (Rust/C/C++) for direct FFI from Lua if a zero‑overhead integration is needed
- Enforce parity via shared spec/contracts in CI (see architecture doc)

## Suggested Neovim Plugin Structure

```
rangelink-neovim-plugin/
  lua/rangelink/
    init.lua          # Plugin entry point
    commands.lua      # :RangeLinkCopy, :RangeLinkCopyPortable, :RangeLinkGo
    selection.lua     # Use Neovim API to extract selections (incl. visual block)
    transport.lua     # jobstart/http client calling the TS core
    parser.lua        # Optional helpers for parsing links
  plugin/
    rangelink.vim     # Calls lua require('rangelink').setup()
  tests/
  README.md
```

## Commands (examples)

- `:RangeLinkCopy` → build and copy regular link
- `:RangeLinkCopyPortable` → build and copy BYOD link
- `:RangeLinkGo` → parse and navigate to link (clipboard or input)

## Column‑Mode Support

- Visual block mode in Neovim maps to column selections (multi-cursor semantics)
- The plugin should detect visual block and request column‑mode output (double hash `##` for the range)

## Portable (BYOD) Links

- Use the metadata format: `path#...~#~L~-~C~` (see README)
- Parsing BYOD ignores local delimiter settings and uses embedded metadata

## Pros/Cons Summary

- Start with CLI (Option 1) for simplicity
- Consider HTTP (Option 2) if you need lower latency for repeated calls
- Use coc.nvim (Option 3) if your team already standardizes on coc
- Explore native core (Option 4) if you need zero‑overhead and no Node dependency

## Next Steps

- Implement `transport.lua` with a minimal CLI contract
- Add tests for: single/multi-line, column‑mode, BYOD, error paths
- Wire commands and visual mode detection
