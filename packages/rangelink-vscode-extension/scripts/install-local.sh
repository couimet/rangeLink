#!/usr/bin/env bash

# Install RangeLink extension locally for testing
# Usage:
#   ./scripts/install-local.sh            # Installs in both VS Code and Cursor
#   ./scripts/install-local.sh vscode     # Installs only in VS Code
#   ./scripts/install-local.sh cursor     # Installs only in Cursor

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

# Parse editor argument
EDITOR="${1:-both}"

if [[ "$EDITOR" != "vscode" && "$EDITOR" != "cursor" && "$EDITOR" != "both" ]]; then
  echo -e "${RED}Unknown editor: $EDITOR${NC}"
  echo "Usage: $0 [vscode|cursor|both]"
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: Could not extract version from package.json${NC}"
  exit 1
fi

VSIX_FILE="rangelink-vscode-extension-${VERSION}.vsix"

# Check if VSIX file exists
if [ ! -f "$VSIX_FILE" ]; then
  echo -e "${YELLOW}VSIX file not found: $VSIX_FILE${NC}"
  echo -e "${BLUE}Building extension first...${NC}"

  # Run from package directory
  pnpm package

  if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}Error: Failed to build extension${NC}"
    exit 1
  fi
fi

# Function to install in an editor
install_in_editor() {
  local editor_name=$1
  local editor_cmd=$2

  if ! command -v "$editor_cmd" &> /dev/null; then
    echo -e "${YELLOW}${editor_name} CLI not found, skipping...${NC}"
    echo -e "${BLUE}Tip: You can still install manually via ${editor_name} UI:${NC}"
    echo "  1. Open ${editor_name}"
    echo "  2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)"
    echo "  3. Click ... menu → Install from VSIX"
    echo "  4. Select: $VSIX_FILE"
    return 1
  fi

  echo -e "${BLUE}Installing in ${editor_name}...${NC}"
  "$editor_cmd" --install-extension "$VSIX_FILE"
  echo -e "${GREEN}✓ Installed in ${editor_name}${NC}"
  return 0
}

# Install based on editor selection
echo -e "${BLUE}Installing RangeLink v${VERSION} locally...${NC}\n"

if [[ "$EDITOR" == "vscode" || "$EDITOR" == "both" ]]; then
  install_in_editor "VS Code" "code" || true
fi

if [[ "$EDITOR" == "cursor" || "$EDITOR" == "both" ]]; then
  install_in_editor "Cursor" "cursor" || true
fi

echo -e "\n${GREEN}Done!${NC}"
echo -e "${BLUE}Test the extension:${NC}"
echo "  1. Open any file"
echo "  2. Select some text"
echo "  3. Press Ctrl+R Ctrl+L (or Cmd+R Cmd+L on Mac)"
echo "  4. The link should be copied to clipboard"
