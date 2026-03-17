#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/qa-smoke-setup.sh [OPTIONS]
#
# Automated workspace bootstrap for manual QA testing.
# Builds the extension, installs into an isolated qa-test profile,
# applies a settings profile, generates a QA checklist, and launches the editor.
#
# Options:
#   --editor <vscode|cursor|both>    Editor to target (default: both)
#   --settings <profile-name>        Settings profile to apply (default: default)
#   --skip-build                     Skip build+install, assume extension is current
#   --terminal-count <N>             Remind to open N terminal tabs (default: 0)
#   --list-profiles                  List available settings profiles and exit
#   --clean                          Remove qa-test profile extension and regenerate checklist
#   --help                           Show usage
#
# Requires: jq, python3 with PyYAML

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"
FIXTURES_DIR="$QA_DIR/fixtures"
WORKSPACE_DIR="$FIXTURES_DIR/workspace"
SETTINGS_DIR="$FIXTURES_DIR/settings"

EDITOR_TARGET="both"
SETTINGS_PROFILE="default"
SKIP_BUILD=false
TERMINAL_COUNT=0
DO_CLEAN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Automated workspace bootstrap for manual QA testing.

Options:
  --editor <vscode|cursor|both>    Editor to target (default: both)
  --settings <profile-name>        Settings profile to apply (default: default)
  --skip-build                     Skip build+install, assume extension is current
  --terminal-count <N>             Remind to open N terminal tabs (default: 0)
  --list-profiles                  List available settings profiles and exit
  --clean                          Remove qa-test profile extension and regenerate checklist
  --help                           Show usage

Settings profiles (qa/fixtures/settings/):
  default             clipboard=always, warnOnDirtyBuffer=true
  clipboard-never     clipboard=never
  no-dirty-warning    warnOnDirtyBuffer=false
  custom-delimiters   delimiterLine=@l, delimiterPosition=@c
  terminal-picker-low terminalPicker.maxInline=2
EOF
}

list_profiles() {
  echo -e "${BOLD}Available settings profiles:${NC}"
  echo ""
  for profile_file in "$SETTINGS_DIR"/*.json; do
    [[ -e "$profile_file" ]] || continue
    local name
    name="$(basename "$profile_file" .json)"
    local desc=""
    case "$name" in
      default)             desc="clipboard=always, warnOnDirtyBuffer=true" ;;
      clipboard-never)     desc="clipboard=never" ;;
      no-dirty-warning)    desc="warnOnDirtyBuffer=false" ;;
      custom-delimiters)   desc="delimiterLine=@l, delimiterPosition=@c" ;;
      terminal-picker-low) desc="terminalPicker.maxInline=2" ;;
      *)                   desc="(custom profile)" ;;
    esac
    printf "  ${GREEN}%-22s${NC} %s\n" "$name" "$desc"
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --editor)
      EDITOR_TARGET="${2:-}"
      if [[ -z "$EDITOR_TARGET" || ! "$EDITOR_TARGET" =~ ^(vscode|cursor|both)$ ]]; then
        echo -e "${RED}Error: --editor requires one of: vscode, cursor, both${NC}" >&2
        exit 1
      fi
      shift 2 ;;
    --settings)
      SETTINGS_PROFILE="${2:-}"
      if [[ -z "$SETTINGS_PROFILE" ]]; then
        echo -e "${RED}Error: --settings requires a profile name${NC}" >&2
        exit 1
      fi
      shift 2 ;;
    --skip-build)    SKIP_BUILD=true; shift ;;
    --terminal-count)
      TERMINAL_COUNT="${2:-0}"
      shift 2 ;;
    --list-profiles) list_profiles; exit 0 ;;
    --clean)         DO_CLEAN=true; shift ;;
    --help)          show_help; exit 0 ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      show_help >&2
      exit 1 ;;
  esac
done

PROFILE_SETTINGS="$SETTINGS_DIR/${SETTINGS_PROFILE}.json"
if [[ ! -f "$PROFILE_SETTINGS" ]]; then
  echo -e "${RED}Error: settings profile not found: $PROFILE_SETTINGS${NC}" >&2
  echo -e "${BLUE}Available profiles:${NC}" >&2
  list_profiles >&2
  exit 1
fi

if [[ ! -d "$WORKSPACE_DIR" ]]; then
  echo -e "${RED}Error: fixture workspace not found at $WORKSPACE_DIR${NC}" >&2
  echo "Run from the repo root, or check that qa/fixtures/workspace/ is checked in." >&2
  exit 1
fi

NEXT_VERSION=$(jq -r '.nextTargetVersion // empty' "$PACKAGE_JSON")
if [[ -z "$NEXT_VERSION" ]]; then
  echo -e "${RED}Error: nextTargetVersion not set in $PACKAGE_JSON${NC}" >&2
  exit 1
fi

VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
VSIX_FILE="$PACKAGE_DIR/rangelink-vscode-extension-${VERSION}.vsix"

resolve_editor() {
  local editor_cmd=$1
  local editor_absolute

  if ! command -v "$editor_cmd" &>/dev/null; then
    if [[ "$editor_cmd" == "code" ]]; then
      local vscode_path="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
      if [[ -x "$vscode_path" ]]; then
        echo "$vscode_path"
        return 0
      fi
    fi
    return 1
  fi

  editor_absolute="$(command -v "$editor_cmd")"

  if [[ "$editor_cmd" == "code" && -L "$editor_absolute" ]]; then
    local real_path
    real_path="$(readlink "$editor_absolute")"
    if [[ "$real_path" == *"Cursor.app"* ]]; then
      local vscode_path="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
      if [[ -x "$vscode_path" ]]; then
        echo "$vscode_path"
        return 0
      fi
      return 1
    fi
  fi

  echo "$editor_absolute"
}

resolve_editor_name() {
  local editor_cmd=$1
  local resolved=$2
  if [[ "$resolved" == *"Cursor"* ]]; then
    echo "Cursor"
  elif [[ "$editor_cmd" == "code" ]]; then
    echo "VS Code"
  else
    echo "Cursor"
  fi
}

EDITORS=()
EDITOR_NAMES=()

collect_editors() {
  if [[ "$EDITOR_TARGET" == "vscode" || "$EDITOR_TARGET" == "both" ]]; then
    local resolved
    if resolved=$(resolve_editor "code"); then
      EDITORS+=("$resolved")
      EDITOR_NAMES+=("$(resolve_editor_name "code" "$resolved")")
    else
      echo -e "${YELLOW}VS Code CLI not found, skipping...${NC}"
    fi
  fi

  if [[ "$EDITOR_TARGET" == "cursor" || "$EDITOR_TARGET" == "both" ]]; then
    local resolved
    if resolved=$(resolve_editor "cursor"); then
      EDITORS+=("$resolved")
      EDITOR_NAMES+=("$(resolve_editor_name "cursor" "$resolved")")
    else
      echo -e "${YELLOW}Cursor CLI not found, skipping...${NC}"
    fi
  fi

  if [[ ${#EDITORS[@]} -eq 0 ]]; then
    echo -e "${RED}Error: no editors found for target '$EDITOR_TARGET'${NC}" >&2
    exit 1
  fi
}

collect_editors

if [[ "$DO_CLEAN" == true ]]; then
  echo -e "${BLUE}Cleaning qa-test profile...${NC}"
  for i in "${!EDITORS[@]}"; do
    local_editor="${EDITORS[$i]}"
    local_name="${EDITOR_NAMES[$i]}"
    echo -e "  ${DIM}${local_name}: uninstalling extension from qa-test profile${NC}"
    "$local_editor" --profile qa-test --uninstall-extension couimet.rangelink-vscode-extension 2>/dev/null || true
  done
  echo -e "${GREEN}Profile cleaned.${NC}"
  echo ""
fi

# --- Phase 1: Build + Install ---

if [[ "$SKIP_BUILD" == true ]]; then
  echo -e "${DIM}Phase 1: Build skipped (--skip-build)${NC}"
else
  NEEDS_BUILD=false
  if [[ ! -f "$VSIX_FILE" ]]; then
    NEEDS_BUILD=true
  else
    VSIX_MTIME=$(stat -f %m "$VSIX_FILE" 2>/dev/null || stat -c %Y "$VSIX_FILE" 2>/dev/null)
    SRC_MTIME=$(find "$PACKAGE_DIR/src" -type f -newer "$VSIX_FILE" 2>/dev/null | head -1)
    if [[ -n "$SRC_MTIME" ]]; then
      NEEDS_BUILD=true
    fi
  fi

  if [[ "$NEEDS_BUILD" == true ]]; then
    echo -e "${BLUE}Phase 1: Building extension...${NC}"
    (cd "$REPO_ROOT" && pnpm package:vscode-extension)
    echo -e "${GREEN}Build complete.${NC}"
  else
    echo -e "${DIM}Phase 1: Extension .vsix is current, skipping build${NC}"
  fi
fi

VSIX_ABSOLUTE="$(cd "$(dirname "$VSIX_FILE")" 2>/dev/null && pwd)/$(basename "$VSIX_FILE")"

# --- Phase 2: Profile + Extension Install ---

echo -e "${BLUE}Phase 2: Installing into qa-test profile...${NC}"
for i in "${!EDITORS[@]}"; do
  local_editor="${EDITORS[$i]}"
  local_name="${EDITOR_NAMES[$i]}"
  echo -e "  ${local_name}: installing extension..."
  "$local_editor" --profile qa-test --install-extension "$VSIX_ABSOLUTE" 2>&1 | head -3
done
echo -e "${GREEN}Profile install complete.${NC}"

# --- Phase 3: Fixture Workspace Setup ---

echo -e "${BLUE}Phase 3: Setting up fixture workspace...${NC}"

cp "$PROFILE_SETTINGS" "$WORKSPACE_DIR/.vscode/settings.json"
echo -e "  Settings profile: ${GREEN}${SETTINGS_PROFILE}${NC}"

CHECKLIST_OUTPUT=$("$SCRIPT_DIR/generate-qa-checklist.sh" 2>&1)
CHECKLIST_FILE=$(echo "$CHECKLIST_OUTPUT" | grep "^Checklist:" | sed 's/^Checklist: //')
echo -e "  ${CHECKLIST_OUTPUT}"

# --- Phase 4: Editor Launch ---

echo -e "${BLUE}Phase 4: Launching editors...${NC}"

WORKSPACE_ABSOLUTE="$(cd "$WORKSPACE_DIR" && pwd)"

for i in "${!EDITORS[@]}"; do
  local_editor="${EDITORS[$i]}"
  local_name="${EDITOR_NAMES[$i]}"
  echo -e "  Launching ${local_name} with qa-test profile..."
  "$local_editor" --profile qa-test --new-window "$WORKSPACE_ABSOLUTE" &
done

# --- Version info ---

VERSION_INFO=""
if [[ -f "$PACKAGE_DIR/src/version.json" ]]; then
  COMMIT=$(jq -r '.commit // "unknown"' "$PACKAGE_DIR/src/version.json" 2>/dev/null)
  BRANCH=$(jq -r '.branch // "unknown"' "$PACKAGE_DIR/src/version.json" 2>/dev/null)
  BUILD_DATE=$(jq -r '.buildDate // "unknown"' "$PACKAGE_DIR/src/version.json" 2>/dev/null)
  VERSION_INFO="${VERSION} (${COMMIT}, ${BRANCH}, ${BUILD_DATE})"
else
  VERSION_INFO="${VERSION}"
fi

# --- QA Session Summary Banner ---

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  RangeLink QA Session — v${NEXT_VERSION}$(printf '%*s' $((36 - ${#NEXT_VERSION})) '')║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Editor:    ${CYAN}$(IFS=', '; echo "${EDITOR_NAMES[*]}")${NC}$(printf '%*s' $((48 - ${#EDITOR_NAMES[*]} * 8)) '')${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Settings:  ${CYAN}${SETTINGS_PROFILE}${NC}$(printf '%*s' $((48 - ${#SETTINGS_PROFILE})) '')${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Extension: ${CYAN}${VERSION_INFO}${NC}$(printf '%*s' $((48 - ${#VERSION_INFO})) '')${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Workspace: ${CYAN}qa/fixtures/workspace/${NC}$(printf '%*s' 27 '')${BOLD}║${NC}"
if [[ -n "${CHECKLIST_FILE:-}" ]]; then
  local_checklist_basename=$(basename "$CHECKLIST_FILE")
  echo -e "${BOLD}║${NC}  Checklist: ${CYAN}${local_checklist_basename}${NC}$(printf '%*s' $((48 - ${#local_checklist_basename})) '')${BOLD}║${NC}"
fi
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}Ready now:${NC} editor-only TCs (no terminal/binding needed)     ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${YELLOW}After setup:${NC} open 1+ terminals, R-D bind, then continue    ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}                                                              ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  Switch settings:                                            ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}    ${DIM}./scripts/qa-smoke-setup.sh --settings clipboard-never${NC}    ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}    ${DIM}./scripts/qa-smoke-setup.sh --settings custom-delimiters${NC}  ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"

if [[ "$TERMINAL_COUNT" -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}Reminder: open ${TERMINAL_COUNT} terminal(s) in the editor for binding tests${NC}"
fi

echo ""
echo -e "${GREEN}QA session ready.${NC} Open the checklist to start testing."
