#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/start-release.sh
#
# Starts the next development cycle after a release. Reads .version from
# package.json. Idempotent — safe to re-run.
#
# Steps:
#   0. If on main, create a post-release-v<VERSION> branch (otherwise apply in-place)
#   1. Prepend [Unreleased] header with empty sections to CHANGELOG
#   2. Re-add [!IMPORTANT] banner to README
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

# --- Branch management ---

CURRENT_BRANCH=$(git -C "$PACKAGE_DIR" rev-parse --abbrev-ref HEAD)
MAIN_BRANCH=$(git -C "$PACKAGE_DIR" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo 'main')

if [[ "$CURRENT_BRANCH" == "$MAIN_BRANCH" ]]; then
  NEW_BRANCH="post-release-v${VERSION}"
  echo -e "On ${MAIN_BRANCH} — creating branch ${GREEN}${NEW_BRANCH}${NC}"
  git -C "$PACKAGE_DIR" checkout -b "$NEW_BRANCH"
else
  echo -e "${YELLOW}On branch ${CURRENT_BRANCH} — applying changes in-place.${NC}"
fi

# --- Prerequisites ---

QA_YAML="$QA_DIR/qa-test-cases.yaml"
if [[ ! -f "$QA_YAML" ]]; then
  echo -e "${RED}Error: $QA_YAML not found.${NC}" >&2
  exit 1
fi

CHANGED=false

# --- Step 1: Prepend [Unreleased] header to CHANGELOG ---

if grep -q '^## \[Unreleased\]$' "$CHANGELOG"; then
  echo -e "${YELLOW}Step 1: [Unreleased] section already exists in CHANGELOG — skipped.${NC}"
else
  INSERT_LINE=$(grep -n '^## \[' "$CHANGELOG" | head -1 | cut -d: -f1)
  if [[ -n "$INSERT_LINE" ]] && [[ "$INSERT_LINE" -eq 1 ]]; then
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
  echo -e "${GREEN}Step 1: Prepended [Unreleased] header to CHANGELOG${NC}"
  CHANGED=true
fi

# --- Step 2: Re-add [!IMPORTANT] banner to README ---

if grep -q '\[!IMPORTANT\]' "$README"; then
  echo -e "${YELLOW}Step 2: [!IMPORTANT] banner already exists in README — skipped.${NC}"
else
  INSERT_LINE=$(grep -n '^## ' "$README" | head -1 | cut -d: -f1)
  if [[ -n "$INSERT_LINE" ]] && [[ "$INSERT_LINE" -eq 1 ]]; then
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
  echo -e "${GREEN}Step 2: Added [!IMPORTANT] banner to README${NC}"
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
