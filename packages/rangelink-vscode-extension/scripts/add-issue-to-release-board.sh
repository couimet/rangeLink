#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/add-issue-to-release-board.sh <issue-url> [--dry-run]
#
# Adds an existing GitHub issue (any repository) to the release project board
# for the version in package.json, with Status set to Ready where the board
# has a Ready option. Used by the release-prep skill for the cross-repo
# couimet.github.io article-registration issue; prints the board URL for the
# skill's final report.
#
# The release board is resolved by exact title match on the current user's
# projectsV2; candidates are listed when no exact match exists. With
# --dry-run, prints the resolved inputs without making any GitHub calls.
# Board operations live in release-board-lib.sh (sourced).
#
# Requires:
#   jq         — reads .version from package.json and builds GraphQL payloads
#   gh CLI     — authenticated with access to the issue and the user's projectsV2

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DRY_RUN=false
ISSUE_URL=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --) ;;
    -*) echo "Unknown argument: $arg" >&2; exit 1 ;;
    *)
      if [[ -n "$ISSUE_URL" ]]; then
        echo -e "${RED}Error: unexpected extra argument: $arg${NC}" >&2
        exit 1
      fi
      ISSUE_URL="$arg"
      ;;
  esac
done

if [[ -z "$ISSUE_URL" ]]; then
  echo -e "${RED}Usage: $0 <issue-url> [--dry-run]${NC}" >&2
  echo "Example: $0 https://github.com/couimet/couimet.github.io/issues/12" >&2
  exit 1
fi

if [[ "$ISSUE_URL" =~ ^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/issues/([0-9]+)$ ]]; then
  ISSUE_REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
else
  echo -e "${RED}Error: issue URL must look like https://github.com/<owner>/<repo>/issues/<number>${NC}" >&2
  echo "  got: $ISSUE_URL" >&2
  exit 1
fi

if [[ "$DRY_RUN" == false ]] && ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is required but not found on PATH" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/release-board-lib.sh"

VERSION=$(jq -r '.version // empty' "$PACKAGE_DIR/package.json")
if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Error: .version not set in $PACKAGE_DIR/package.json${NC}" >&2
  exit 1
fi

BOARD_TITLE="RangeLink v${VERSION} release"

echo "Release board add"
echo "  Version : v$VERSION"
echo "  Board   : $BOARD_TITLE"
echo "  Issue   : $ISSUE_URL ($ISSUE_REPO)"
[[ "$DRY_RUN" == true ]] && echo "  Mode    : DRY RUN (no GitHub calls)"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY-RUN: would add $ISSUE_URL to '$BOARD_TITLE' with Status: Ready"
  exit 0
fi

# --- Resolve the release board ---

PROJECTS_RESPONSE=$(list_release_projects)

BOARD_RESOLVED=$(resolve_release_board "$BOARD_TITLE")
BOARD_ID=$(echo "$BOARD_RESOLVED" | cut -f1)
BOARD_NUMBER=$(echo "$BOARD_RESOLVED" | cut -f2)
BOARD_URL=$(echo "$BOARD_RESOLVED" | cut -f3)

STATUS_READY=$(resolve_status_ready "$PROJECTS_RESPONSE" "$BOARD_ID")
STATUS_FIELD_ID=$(echo "$STATUS_READY" | cut -f1)
READY_OPTION_ID=$(echo "$STATUS_READY" | cut -f2)

echo -e "${GREEN}Resolved release board: $BOARD_TITLE (project #$BOARD_NUMBER)${NC}"

# --- Resolve the issue node id ---

ISSUE_NODE_ID=$(gh issue view "$ISSUE_URL" --json id --jq .id)
if [[ -z "$ISSUE_NODE_ID" || "$ISSUE_NODE_ID" == "null" ]]; then
  echo -e "${RED}Error: could not resolve node id for $ISSUE_URL${NC}" >&2
  exit 1
fi

# --- Add the issue to the board and set Status to Ready ---

ITEM_ID=$(add_board_item "$BOARD_ID" "$ISSUE_NODE_ID")
if [[ -z "$ITEM_ID" || "$ITEM_ID" == "null" ]]; then
  echo -e "${RED}Error: addProjectV2ItemById did not return an item id${NC}" >&2
  exit 1
fi

echo -e "${GREEN}Added issue to the release board.${NC}"

if [[ -z "$STATUS_FIELD_ID" || -z "$READY_OPTION_ID" ]]; then
  echo -e "${YELLOW}Warning: release board has no 'Status' field with a 'Ready' option — status left unset${NC}"
  STATUS_VALUE="unset"
else
  set_board_field_value "$BOARD_ID" "$ITEM_ID" "$STATUS_FIELD_ID" "$READY_OPTION_ID"
  STATUS_VALUE="Ready"
fi

echo ""
echo -e "${GREEN}Done.${NC}"
echo "Added: $ISSUE_URL to $BOARD_TITLE (project #$BOARD_NUMBER), status: $STATUS_VALUE"
echo "Board URL: $BOARD_URL"
