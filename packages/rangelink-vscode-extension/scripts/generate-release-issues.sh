#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/generate-release-issues.sh <qa-issue-url> [--dry-run]
#
# Creates the dev.to post issue for the version in package.json and adds it
# plus the QA issue to the "RangeLink vX.Y.Z release" project board, with
# Status set to Ready where the board has a Ready option.
#
# The release board is resolved by exact title match on the current user's
# projectsV2; candidates are listed when no exact match exists. With
# --dry-run, prints the issue title and body without making any GitHub calls.
# Board operations live in release-board-lib.sh (sourced).
#
# Requires:
#   jq         — reads .version from package.json and builds GraphQL payloads
#   gh CLI     — authenticated with write access to the repo (not needed with --dry-run)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DRY_RUN=false
QA_ISSUE_URL=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --) ;;
    -*) echo "Unknown argument: $arg" >&2; exit 1 ;;
    *)
      if [[ -n "$QA_ISSUE_URL" ]]; then
        echo -e "${RED}Error: unexpected extra argument: $arg${NC}" >&2
        exit 1
      fi
      QA_ISSUE_URL="$arg"
      ;;
  esac
done

if [[ -z "$QA_ISSUE_URL" ]]; then
  echo -e "${RED}Usage: $0 <qa-issue-url> [--dry-run]${NC}" >&2
  echo "Example: $0 https://github.com/couimet/rangeLink/issues/123" >&2
  exit 1
fi

if [[ "$QA_ISSUE_URL" =~ ^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/issues/([0-9]+)$ ]]; then
  REPO_OWNER="${BASH_REMATCH[1]}"
  REPO_NAME="${BASH_REMATCH[2]}"
  QA_ISSUE_NUMBER="${BASH_REMATCH[3]}"
else
  echo -e "${RED}Error: QA issue URL must look like https://github.com/<owner>/<repo>/issues/<number>${NC}" >&2
  echo "  got: $QA_ISSUE_URL" >&2
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
DEVTO_TITLE="Prepare dev.to post for v${VERSION} release"
DEVTO_BODY="Prepare a dev.to article announcing the RangeLink v${VERSION} release to the broader developer community.

## Acceptance Criteria

- [ ] Draft article written (after feature freeze)
- [ ] Screenshots/GIFs prepared
- [ ] Article reviewed
- [ ] Ready to publish on release day

## Resources

- Draft template: \`media/devto-post-vscode-extension-v${VERSION}.md\`
- Update the [Featured In](packages/rangelink-vscode-extension/README.md#featured-in) section of the extension README with the published article link"

echo "Release issue generator"
echo "  Version  : v$VERSION"
echo "  Board    : $BOARD_TITLE"
echo "  QA issue : $QA_ISSUE_URL"
[[ "$DRY_RUN" == true ]] && echo "  Mode     : DRY RUN (no GitHub calls)"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY-RUN issue: $DEVTO_TITLE"
  echo ""
  echo "--- Body ---"
  echo "$DEVTO_BODY"
  echo "---"
  echo "DRY-RUN: skipping board lookup and project updates"
  exit 0
fi

# --- Resolve the release board ---

PROJECTS_RESPONSE=$(list_release_projects)

BOARD_RESOLVED=$(resolve_release_board "$BOARD_TITLE")
BOARD_ID=$(echo "$BOARD_RESOLVED" | cut -f1)
BOARD_NUMBER=$(echo "$BOARD_RESOLVED" | cut -f2)

STATUS_READY=$(resolve_status_ready "$PROJECTS_RESPONSE" "$BOARD_ID")
STATUS_FIELD_ID=$(echo "$STATUS_READY" | cut -f1)
READY_OPTION_ID=$(echo "$STATUS_READY" | cut -f2)

echo -e "${GREEN}Resolved release board: $BOARD_TITLE (project #$BOARD_NUMBER)${NC}"
echo ""

# --- Create the dev.to issue ---

echo -e "${GREEN}Creating dev.to post issue...${NC}"
DEVTO_URL=$(gh issue create --title "$DEVTO_TITLE" --body "$DEVTO_BODY")
echo "Created: $DEVTO_URL"
echo ""

DEVTO_ISSUE_NUMBER=$(echo "$DEVTO_URL" | sed -E 's|.*/issues/([0-9]+)$|\1|')

# --- Resolve GraphQL node ids for both issues ---

ISSUE_IDS_QUERY="query { repository(owner: \"$REPO_OWNER\", name: \"$REPO_NAME\") { devto: issue(number: $DEVTO_ISSUE_NUMBER) { id } qa: issue(number: $QA_ISSUE_NUMBER) { id } } }"
ISSUE_IDS_RESPONSE=$(graphql_call "$(jq -n --arg q "$ISSUE_IDS_QUERY" '{query: $q, variables: {}}')")

DEVTO_NODE_ID=$(echo "$ISSUE_IDS_RESPONSE" | jq -r '.data.repository.devto.id')
QA_NODE_ID=$(echo "$ISSUE_IDS_RESPONSE" | jq -r '.data.repository.qa.id')
if [[ -z "$DEVTO_NODE_ID" || "$DEVTO_NODE_ID" == "null" || -z "$QA_NODE_ID" || "$QA_NODE_ID" == "null" ]]; then
  echo -e "${RED}Error: could not resolve GraphQL node ids for $DEVTO_URL and $QA_ISSUE_URL${NC}" >&2
  exit 1
fi

# --- Add both issues to the board and set Status to Ready ---

echo -e "${GREEN}Adding issues to the release board...${NC}"

DEVTO_ITEM_ID=$(add_board_item "$BOARD_ID" "$DEVTO_NODE_ID")
QA_ITEM_ID=$(add_board_item "$BOARD_ID" "$QA_NODE_ID")

if [[ -z "$STATUS_FIELD_ID" || -z "$READY_OPTION_ID" ]]; then
  echo -e "${YELLOW}Warning: release board has no 'Status' field with a 'Ready' option — skipping status updates${NC}"
  DEVTO_STATUS="unset"
  QA_STATUS="unset"
else
  set_board_field_value "$BOARD_ID" "$DEVTO_ITEM_ID" "$STATUS_FIELD_ID" "$READY_OPTION_ID"
  set_board_field_value "$BOARD_ID" "$QA_ITEM_ID" "$STATUS_FIELD_ID" "$READY_OPTION_ID"
  DEVTO_STATUS="Ready"
  QA_STATUS="Ready"
fi

echo ""
echo -e "${GREEN}Release issues ready.${NC}"
echo "  Board: $BOARD_TITLE (project #$BOARD_NUMBER)"
echo "  - dev.to issue: $DEVTO_URL — status: $DEVTO_STATUS"
echo "  - QA issue: $QA_ISSUE_URL — status: $QA_STATUS"
