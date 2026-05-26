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

if ! git -C "$REPO_ROOT" diff-index --quiet HEAD --; then
  echo -e "${RED}Error: working tree is dirty. Commit or stash changes first.${NC}" >&2
  exit 1
fi

# --- Prerequisites ---

VERSIONED_YAML="$QA_DIR/qa-test-cases-v${VERSION}.yaml"
if [[ ! -f "$VERSIONED_YAML" ]]; then
  echo -e "${RED}Error: $VERSIONED_YAML not found. Run lock-version.sh first.${NC}" >&2
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

TODAY=$(date -u +"%Y-%m-%d")
sed -i '' "s/^## \[Unreleased\]$/## [${VERSION}] - ${TODAY}/" "$CHANGELOG"
echo -e "${GREEN}Step 1: Finalized CHANGELOG — [Unreleased] → [${VERSION}] - ${TODAY}${NC}"

# --- Step 2: Strip README <sup>Unreleased</sup> markers ---

sed -i '' 's/<sup>Unreleased<\/sup>//g' "$README"
echo -e "${GREEN}Step 2: Stripped <sup>Unreleased</sup> markers from README${NC}"

# --- Step 3: Strip README > [!IMPORTANT] banner ---

sed -i '' '/^> \[!IMPORTANT\]/,/^$/d' "$README"
echo -e "${GREEN}Step 3: Removed [!IMPORTANT] banner from README${NC}"

# --- Step 4: Format with prettier ---

cd "$REPO_ROOT"
npx prettier --write "$README" "$CHANGELOG" > /dev/null 2>&1
cd "$PACKAGE_DIR"

# --- Step 5: Generate publishing instructions ---

"$SCRIPT_DIR/generate-publishing-instructions.sh"
echo -e "${GREEN}Step 4: Generated publishing instructions${NC}"

echo ""
echo -e "${GREEN}Release v${VERSION} finalized. Publishing instructions are ready.${NC}"
