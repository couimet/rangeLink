#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/finalize-release.sh
#
# Hard-finalizes the release. Reads .version from package.json. One-way door —
# run once when QA is clean and you're ready to ship.
#
# Steps:
#   1. Finalize CHANGELOG: ## [Unreleased] → ## [X.Y.Z] - YYYY-MM-DD
#   2. Strip <sup>Unreleased</sup> markers from README
#   3. Remove [!IMPORTANT] banner from README
#   4. Generate publishing instructions
#
# Requires: jq

RED='\033[0;31m'
GREEN='\033[0;32m'
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

# --- Working tree must be clean ---

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  echo -e "${RED}Error: working tree is dirty. Commit or stash changes first.${NC}" >&2
  exit 1
fi

# --- Prerequisites ---

QA_YAML="$QA_DIR/qa-test-cases.yaml"
if [[ ! -f "$QA_YAML" ]]; then
  echo -e "${RED}Error: $QA_YAML not found.${NC}" >&2
  exit 1
fi

if ! grep -q '^## \[Unreleased\]$' "$CHANGELOG"; then
  echo -e "${RED}Error: '## [Unreleased]' section not found in $CHANGELOG${NC}" >&2
  exit 1
fi

if ! grep -q '<sup>Unreleased</sup>' "$README"; then
  echo -e "${RED}Error: no <sup>Unreleased</sup> markers found in $README${NC}" >&2
  exit 1
fi

# --- Step 1: Finalize CHANGELOG ---

sed -i.bak "s/^## \[Unreleased\]$/## [${VERSION}]/" "$CHANGELOG" && rm -f "${CHANGELOG}.bak"
echo -e "${GREEN}Step 1: Finalized CHANGELOG — [Unreleased] → [${VERSION}]${NC}"

# --- Step 2: Update CHANGELOG reference links ---

# Extract the previous version from the [Unreleased] compare URL, e.g.:
#   [Unreleased]: https://...compare/vscode-extension-v1.0.0...HEAD
# gives PREV=1.0.0. This is used to build the new [VERSION] link.
PREV=$(sed -n 's/^\[Unreleased\]: .*compare\/vscode-extension-v\([0-9.]*\)\.\.\.HEAD$/\1/p' "$CHANGELOG")
if [[ -z "$PREV" ]]; then
  echo -e "${RED}Error: Could not extract previous version from [Unreleased] reference link in $CHANGELOG${NC}" >&2
  exit 1
fi

sed -i.bak \
  -e "s|^\[Unreleased\]: \(.*compare/\)vscode-extension-v${PREV}\(...HEAD\)$|[Unreleased]: \1vscode-extension-v${VERSION}\2|" \
  "$CHANGELOG" && rm -f "${CHANGELOG}.bak"

# Append the new version link after the [Unreleased] line so newer links stay at the top.
sed -i.bak "/^\[Unreleased\]:/a\\
[${VERSION}]: https://github.com/couimet/rangelink/compare/vscode-extension-v${PREV}...vscode-extension-v${VERSION}" "$CHANGELOG" && rm -f "${CHANGELOG}.bak"

echo -e "${GREEN}Step 2: Updated CHANGELOG reference links — Unreleased → v${VERSION}, added [${VERSION}]${NC}"

# --- Step 3: Strip README <sup>Unreleased</sup> markers ---

sed -i.bak 's/<sup>Unreleased<\/sup>//g' "$README" && rm -f "${README}.bak"
echo -e "${GREEN}Step 3: Stripped <sup>Unreleased</sup> markers from README${NC}"

# --- Step 4: Strip README > [!IMPORTANT] banner ---

sed -i.bak '/^> \[!IMPORTANT\]/,/^$/d' "$README" && rm -f "${README}.bak"
echo -e "${GREEN}Step 4: Removed [!IMPORTANT] banner from README${NC}"

# --- Step 5: Format with prettier ---

cd "$REPO_ROOT"
npx prettier --write "$README" "$CHANGELOG" > /dev/null 2>&1
cd "$PACKAGE_DIR"

# --- Step 6: Generate publishing instructions ---

"$SCRIPT_DIR/generate-publishing-instructions.sh"
echo -e "${GREEN}Step 6: Generated publishing instructions${NC}"

echo ""
echo -e "${GREEN}Release v${VERSION} finalized. Publishing instructions are ready.${NC}"
