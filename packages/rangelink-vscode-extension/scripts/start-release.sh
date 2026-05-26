#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/start-release.sh
#
# Starts the next development cycle after a release. Reads .version from
# package.json to find the just-shipped versioned YAML. Idempotent — safe
# to re-run.
#
# Steps:
#   1. Copy versioned YAML → qa-test-cases-unreleased.yaml
#   2. Prepend [Unreleased] header with empty sections to CHANGELOG
#   3. Re-add [!IMPORTANT] banner to README
#
# Requires: jq

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"
README="$PACKAGE_DIR/README.md"
CHANGELOG="$PACKAGE_DIR/CHANGELOG.md"

# --- Read .version ---

VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Error: .version not set in $PACKAGE_JSON${NC}" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: .version must be SemVer (X.Y.Z), got '$VERSION'${NC}" >&2
  exit 1
fi

# --- Prerequisites ---

VERSIONED_YAML="$QA_DIR/qa-test-cases-v${VERSION}.yaml"
if [[ ! -f "$VERSIONED_YAML" ]]; then
  echo -e "${RED}Error: $VERSIONED_YAML not found. Run finalize-release.sh first.${NC}" >&2
  exit 1
fi

CHANGED=false

# --- Step 1: Copy YAML ---

UNRELEASED_YAML="$QA_DIR/qa-test-cases-unreleased.yaml"
if [[ -f "$UNRELEASED_YAML" ]]; then
  echo -e "${YELLOW}Step 1: $UNRELEASED_YAML already exists — skipped.${NC}"
else
  cp "$VERSIONED_YAML" "$UNRELEASED_YAML"
  echo -e "${GREEN}Step 1: Copied qa-test-cases-v${VERSION}.yaml → qa-test-cases-unreleased.yaml${NC}"
  CHANGED=true
fi

# --- Step 2: Prepend [Unreleased] header to CHANGELOG ---

if grep -q '^## \[Unreleased\]$' "$CHANGELOG"; then
  echo -e "${YELLOW}Step 2: [Unreleased] section already exists in CHANGELOG — skipped.${NC}"
else
  INSERT_LINE=$(grep -n '^## \[' "$CHANGELOG" | head -1 | cut -d: -f1)
  if [[ "$INSERT_LINE" -eq 1 ]]; then
    cat > "$CHANGELOG.tmp" <<'HEADER'
## [Unreleased]

### Added

### Changed

### Fixed

HEADER
    cat "$CHANGELOG" >> "$CHANGELOG.tmp"
  else
    head -n $((INSERT_LINE - 1)) "$CHANGELOG" > "$CHANGELOG.tmp"
    cat >> "$CHANGELOG.tmp" <<'HEADER'
## [Unreleased]

### Added

### Changed

### Fixed

HEADER
    tail -n +"$INSERT_LINE" "$CHANGELOG" >> "$CHANGELOG.tmp"
  fi
  mv "$CHANGELOG.tmp" "$CHANGELOG"
  echo -e "${GREEN}Step 2: Prepended [Unreleased] header to CHANGELOG${NC}"
  CHANGED=true
fi

# --- Step 3: Re-add [!IMPORTANT] banner to README ---

if grep -q '\[!IMPORTANT\]' "$README"; then
  echo -e "${YELLOW}Step 3: [!IMPORTANT] banner already exists in README — skipped.${NC}"
else
  INSERT_LINE=$(grep -n '^## ' "$README" | head -1 | cut -d: -f1)
  if [[ "$INSERT_LINE" -eq 1 ]]; then
    cat > "$README.tmp" <<'BANNER'
> [!IMPORTANT]
> This documentation is for the `main` branch and may include unreleased features marked with <sup>Unreleased</sup>.
> Install the latest published version from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension) or [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension) (Cursor) for currently available features.

BANNER
    cat "$README" >> "$README.tmp"
  else
    head -n $((INSERT_LINE - 1)) "$README" > "$README.tmp"
    cat >> "$README.tmp" <<'BANNER'
> [!IMPORTANT]
> This documentation is for the `main` branch and may include unreleased features marked with <sup>Unreleased</sup>.
> Install the latest published version from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension) or [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension) (Cursor) for currently available features.

BANNER
    tail -n +"$INSERT_LINE" "$README" >> "$README.tmp"
  fi
  mv "$README.tmp" "$README"
  echo -e "${GREEN}Step 3: Added [!IMPORTANT] banner to README${NC}"
  CHANGED=true
fi

# --- Format with prettier ---

cd "$REPO_ROOT"
npx prettier --write "$README" "$CHANGELOG" > /dev/null 2>&1
cd "$PACKAGE_DIR"

# --- Summary ---

if [[ "$CHANGED" == "true" ]]; then
  echo ""
  echo -e "${GREEN}Next development cycle started. Begin adding features to the [Unreleased] section.${NC}"
else
  echo ""
  echo -e "${GREEN}Already in development cycle. Nothing to do.${NC}"
fi
