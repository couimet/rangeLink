# Asset Management

**Single Source of Truth:** All shared assets live in `/assets/` at the monorepo root.

## Directory Structure

```
rangeLink/
  assets/
    icon.png          # Extension icon (128x128)
    icon_large.png    # Large icon (512x512)
  packages/
    rangelink-vscode-extension/
      icon.png        # Copied during build (gitignored)
```

## Build Process

**Pre-package script** (`scripts/sync-assets.sh`):

1. Copy `/assets/icon.png` → package directory
2. Validate checksum matches source
3. Fail build if asset missing or corrupted

**Gitignore:** Package-level icons are gitignored (generated during build)

## Why This Approach?

- **Single source:** All extensions reference `/assets/`
- **No duplication:** Icons not committed to package directories
- **Validation:** Build fails if assets missing/mismatched
- **Marketplace:** `package.json` icon reference still works (copied at build time)
- **README:** Uses GitHub raw URL (no local dependency)

## Usage

```bash
# Build extension (auto-copies assets)
pnpm --filter rangelink-vscode-extension package:vscode-extension

# Manually sync assets
./scripts/sync-assets.sh
```

## Validation

Script validates:

- Asset exists in `/assets/`
- Checksum matches between source and destination
- Build fails fast if validation fails
