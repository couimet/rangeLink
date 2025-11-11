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
  local fallback_path=$3

  # Check if command exists
  if ! command -v "$editor_cmd" &> /dev/null; then
    # Try fallback path if provided
    if [ -n "$fallback_path" ] && [ -x "$fallback_path" ]; then
      editor_absolute="$fallback_path"
      echo -e "${BLUE}Using ${editor_name} at: ${editor_absolute}${NC}"
    else
      echo -e "${YELLOW}${editor_name} CLI not found, skipping...${NC}"
      echo -e "${BLUE}Tip: You can still install manually via ${editor_name} UI:${NC}"
      echo "  1. Open ${editor_name}"
      echo "  2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)"
      echo "  3. Click ... menu → Install from VSIX"
      echo "  4. Select: $VSIX_FILE"
      return 1
    fi
  else
    # Get absolute path to editor binary
    editor_absolute="$(command -v "$editor_cmd")"

    # Check if 'code' command points to Cursor instead of VS Code
    if [[ "$editor_cmd" == "code" ]]; then
      # Resolve symlink to get the real target
      local real_path
      if [[ -L "$editor_absolute" ]]; then
        real_path="$(readlink "$editor_absolute")"
      else
        real_path="$editor_absolute"
      fi

      # Check if it points to Cursor
      if [[ "$real_path" == *"Cursor.app"* ]]; then
        echo -e "${YELLOW}⚠ Warning: 'code' command points to Cursor, not VS Code${NC}"
        echo -e "${YELLOW}   Symlink: ${editor_absolute} -> ${real_path}${NC}"

        # Try to find actual VS Code
        local vscode_path="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
        if [ -x "$vscode_path" ]; then
          echo -e "${BLUE}   Using actual VS Code at: ${vscode_path}${NC}"
          editor_absolute="$vscode_path"
          editor_name="VS Code"  # Make sure we report the right editor
        else
          echo -e "${RED}   Could not find VS Code installation${NC}"
          echo -e "${BLUE}   Installing to Cursor instead...${NC}"
          editor_name="Cursor"  # Update to reflect what we're actually installing to
        fi
      fi
    fi
  fi

  # Get absolute path to VSIX file
  local vsix_absolute
  vsix_absolute="$(cd "$(dirname "$VSIX_FILE")" && pwd)/$(basename "$VSIX_FILE")"

  echo -e "${BLUE}Installing in ${editor_name}...${NC}"
  echo -e "${BLUE}Command:${NC} ${editor_absolute} --install-extension \"${vsix_absolute}\""
  echo -e "${BLUE}Actual binary path:${NC} ${editor_absolute}"
  echo ""

  # Run command and capture output
  local install_output
  local exit_code

  install_output=$("$editor_absolute" --install-extension "$vsix_absolute" 2>&1)
  exit_code=$?

  echo "$install_output"
  echo ""

  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✓ Installation command succeeded (exit code: ${exit_code})${NC}"

    # Verify extension is listed (use full extension ID)
    echo -e "${BLUE}Verifying with:${NC} ${editor_absolute} --list-extensions"
    if "$editor_absolute" --list-extensions 2>/dev/null | grep -q "couimet.rangelink-vscode-extension"; then
      echo -e "${GREEN}✓ Extension 'couimet.rangelink-vscode-extension' confirmed in installed extensions${NC}"
    else
      echo -e "${YELLOW}⚠ Warning: Extension ID not found in --list-extensions output${NC}"
      echo -e "${YELLOW}   This may be a VSCode caching issue${NC}"
      echo -e "${YELLOW}   Listing all extensions to verify:${NC}"
      "$editor_absolute" --list-extensions 2>/dev/null | head -10
    fi
    return 0
  else
    echo -e "${RED}✗ Installation failed (exit code: ${exit_code})${NC}"
    return 1
  fi
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

# Show version info if version.json exists
if [ -f "src/version.json" ]; then
  echo -e "\n${BLUE}Version Information:${NC}"
  COMMIT=$(node -p "require('./src/version.json').commit" 2>/dev/null)
  IS_DIRTY=$(node -p "require('./src/version.json').isDirty" 2>/dev/null)
  BRANCH=$(node -p "require('./src/version.json').branch" 2>/dev/null)
  BUILD_DATE=$(node -p "require('./src/version.json').buildDate" 2>/dev/null)

  if [ "$IS_DIRTY" = "true" ]; then
    echo -e "  Version: ${GREEN}v${VERSION}${NC}"
    echo -e "  Commit:  ${YELLOW}${COMMIT}${NC} ${RED}(with uncommitted changes)${NC}"
  else
    echo -e "  Version: ${GREEN}v${VERSION}${NC}"
    echo -e "  Commit:  ${GREEN}${COMMIT}${NC}"
  fi
  echo -e "  Branch:  ${BLUE}${BRANCH}${NC}"
  echo -e "  Built:   ${BLUE}${BUILD_DATE}${NC}"
fi

echo -e "\n${YELLOW}⚠ Important: Reload your editor window to see the extension${NC}"
echo -e "${BLUE}If VS Code is running:${NC}"
echo "  1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)"
echo "  2. Run: Developer: Reload Window"
echo -e "${BLUE}If extension still doesn't appear in UI:${NC}"
echo "  • It IS installed (verified above)"
echo "  • VSCode may have cached the old version"
echo "  • Try: Close VS Code completely, then reopen"
echo "  • Commands still work even if UI doesn't show it immediately"
echo ""
echo -e "${BLUE}Test the extension:${NC}"
echo "  1. Open any file"
echo "  2. Select some text"
echo "  3. Press Ctrl+R Ctrl+L (or Cmd+R Cmd+L on Mac)"
echo "  4. The link should be copied to clipboard"
echo -e "\n${BLUE}Check version (Command Palette):${NC}"
echo "  → RangeLink: Show Version Info"
