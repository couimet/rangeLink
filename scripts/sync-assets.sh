#!/usr/bin/env bash
set -euo pipefail

# Sync assets from /assets/ to package directories with validation

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$REPO_ROOT/assets"

echo "🎨 Syncing assets from $ASSETS_DIR..."

# Function to sync and validate asset
sync_asset() {
  local asset_name="$1"
  local dest_dir="$2"

  local source="$ASSETS_DIR/$asset_name"
  local dest="$dest_dir/$asset_name"

  # Check source exists
  if [[ ! -f "$source" ]]; then
    echo "❌ ERROR: Source asset not found: $source"
    exit 1
  fi

  # Copy asset
  echo "  📋 Copying $asset_name → $dest_dir"
  cp "$source" "$dest"

  # Validate checksums match
  if command -v shasum >/dev/null 2>&1; then
    local source_hash=$(shasum -a 256 "$source" | cut -d' ' -f1)
    local dest_hash=$(shasum -a 256 "$dest" | cut -d' ' -f1)

    if [[ "$source_hash" != "$dest_hash" ]]; then
      echo "❌ ERROR: Checksum mismatch for $asset_name"
      echo "  Source: $source_hash"
      echo "  Dest:   $dest_hash"
      exit 1
    fi

    echo "  ✅ Validated: checksums match"
  else
    echo "  ⚠️  Warning: shasum not available, skipping validation"
  fi
}

# Sync VSCode extension assets
VSCODE_EXT_DIR="$REPO_ROOT/packages/rangelink-vscode-extension"
sync_asset "icon.png" "$VSCODE_EXT_DIR"

echo "✅ Asset sync complete!"
