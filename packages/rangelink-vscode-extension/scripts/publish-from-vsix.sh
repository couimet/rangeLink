#!/usr/bin/env bash

# Publish RangeLink extension using a pre-built VSIX file
# This ensures you're publishing exactly the same VSIX you built and tested
# Usage:
#   ./scripts/publish-from-vsix.sh              # Publishes using existing VSIX

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and package root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PACKAGE_DIR"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: Could not extract version from package.json${NC}"
  exit 1
fi

VSIX_FILE="rangelink-vscode-extension-${VERSION}.vsix"

# Check if VSIX file exists - fail harshly if not found
if [ ! -f "$VSIX_FILE" ]; then
  echo -e "${RED}Error: VSIX file not found: $VSIX_FILE${NC}"
  echo -e "${YELLOW}Expected workflow:${NC}"
  echo "  1. Build VSIX: pnpm package:vscode-extension"
  echo "  2. Test locally: pnpm install-local:vscode-extension:vscode"
  echo "  3. Publish: pnpm publish:vscode-extension:vsix"
  exit 1
fi

# Check if logged in (vsce will fail if not logged in, but we give a helpful message)
echo -e "${YELLOW}Note: Ensure you're logged in to vsce before publishing${NC}"
echo -e "${YELLOW}Login with: pnpx vsce login <publisher-name>${NC}\n"

# Confirm publishing
echo -e "${BLUE}Publishing RangeLink v${VERSION} to VS Code Marketplace...${NC}"
echo -e "${BLUE}Using VSIX file: ${VSIX_FILE}${NC}\n"

# Show VSIX file info
VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
echo -e "${BLUE}VSIX file size: ${VSIX_SIZE}${NC}"

# Publish using the pre-built VSIX file
# We use --packagePath to publish the exact VSIX we built and tested
# We use --no-update-package-json and --no-git-tag-version because
# version and tags should be managed manually in the git workflow
# We use --no-dependencies to skip bundling dependencies
# We use pnpx vsce since vsce is not installed globally
echo -e "\n${BLUE}Publishing to marketplace...${NC}"
pnpx vsce publish \
  --packagePath "$VSIX_FILE" \
  --no-dependencies \
  --no-update-package-json \
  --no-git-tag-version

echo -e "\n${GREEN}✓ Published successfully!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "  1. Wait 5-10 minutes for the marketplace to update"
echo "  2. Visit: https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension"
echo "  3. Verify the version appears correctly"
echo "  4. Test installing from marketplace"

