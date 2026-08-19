#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/rotate-release-board.sh [next-version] [--dry-run]
#
# Rotates the release project board at the start of the next development
# cycle: creates the "RangeLink vX.(Y+1).0 release" project (copying fields
# and views from the just-released "RangeLink vX.Y.Z release" project) and
# moves every non-Done item to it, restoring Status, Priority, and Size.
#
# The next version defaults to a minor bump of .version in package.json;
# pass an explicit SemVer to override for pivots.
#
# Idempotent: if the next project already exists, prints a skip message and
# exits 0. The old project is left open.
#
# Requires:
#   jq   — reads .version from package.json, builds GraphQL payloads, parses responses
#   gh   — authenticated with access to the user's projectsV2 (not needed with --dry-run)

DRY_RUN=false
NEXT_VERSION_ARG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --) ;;
    -*)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
    *) NEXT_VERSION_ARG="$arg" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_JSON="$PACKAGE_DIR/package.json"

source "$SCRIPT_DIR/release-board-lib.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Resolve versions ---

VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Error: .version not set in $PACKAGE_JSON${NC}" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: .version must be SemVer (X.Y.Z), got '$VERSION'${NC}" >&2
  exit 1
fi

if [[ -n "$NEXT_VERSION_ARG" ]]; then
  if [[ ! "$NEXT_VERSION_ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: next version must be SemVer (X.Y.Z), got '$NEXT_VERSION_ARG'${NC}" >&2
    exit 1
  fi
  NEXT_VERSION="$NEXT_VERSION_ARG"
else
  MAJOR="${VERSION%%.*}"
  REST="${VERSION#*.}"
  MINOR="${REST%%.*}"
  NEXT_VERSION="${MAJOR}.$((MINOR + 1)).0"
fi

CURRENT_PROJECT_TITLE="RangeLink v${VERSION} release"
NEXT_PROJECT_TITLE="RangeLink v${NEXT_VERSION} release"

echo "Release board rotation"
echo "  Released version : v$VERSION"
echo "  Next version     : v$NEXT_VERSION"
[[ "$DRY_RUN" == true ]] && echo "  Mode             : DRY RUN (no changes will be made)"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY-RUN: would resolve project '$CURRENT_PROJECT_TITLE'"
  echo "DRY-RUN: would create project '$NEXT_PROJECT_TITLE' via copyProjectV2"
  echo "DRY-RUN: would move every non-Done item to the new project"
  exit 0
fi

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is required but not found on PATH" >&2
  exit 1
fi

COPY_QUERY='mutation ($input: CopyProjectV2Input!) {
  copyProjectV2(input: $input) {
    projectV2 {
      id
      title
      url
    }
  }
}'

ITEMS_QUERY='query ($id: ID!) {
  node(id: $id) {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue { id }
            ... on PullRequest { id }
            ... on DraftIssue { id }
          }
          fieldValues(first: 40) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { name }
              }
            }
          }
        }
      }
    }
  }
}'

FIELDS_QUERY='query ($id: ID!) {
  node(id: $id) {
    ... on ProjectV2 {
      fields(first: 100) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}'

DELETE_ITEM_QUERY='mutation ($input: DeleteProjectV2ItemInput!) {
  deleteProjectV2Item(input: $input) {
    deletedItemId
  }
}'

# --- Step 1: Resolve the current project ---

PROJECTS_JSON=$(list_release_projects)

OLD_PROJECT_ID=$(echo "$PROJECTS_JSON" | jq -r --arg title "$CURRENT_PROJECT_TITLE" \
  '.data.viewer.projectsV2.nodes[]? | select(.title == $title) | .id // empty')
if [[ -z "$OLD_PROJECT_ID" ]]; then
  echo -e "${RED}Error: no project titled '$CURRENT_PROJECT_TITLE' found.${NC}" >&2
  CANDIDATE_TITLES=$(echo "$PROJECTS_JSON" | jq -r '.data.viewer.projectsV2.nodes[]? | .title // empty')
  if [[ -n "$CANDIDATE_TITLES" ]]; then
    echo "Available projects:" >&2
    echo "$CANDIDATE_TITLES" | sed 's/^/  - /' >&2
  fi
  exit 1
fi

echo -e "${GREEN}Found current project: $CURRENT_PROJECT_TITLE${NC}"

# --- Step 2: Idempotency — skip when the next project already exists ---

NEXT_PROJECT_ID=$(echo "$PROJECTS_JSON" | jq -r --arg title "$NEXT_PROJECT_TITLE" \
  '.data.viewer.projectsV2.nodes[]? | select(.title == $title) | .id // empty')
if [[ -n "$NEXT_PROJECT_ID" ]]; then
  echo -e "${YELLOW}Project '$NEXT_PROJECT_TITLE' already exists — skipping rotation.${NC}"
  exit 0
fi

# --- Step 3: Create the next project (copying fields and views) ---
# Draft issues are not copied (includeDraftIssues: false) — every non-Done
# item, drafts included, is moved explicitly in Step 6.
COPY_JSON=$(graphql_call "$(jq -n --arg query "$COPY_QUERY" \
  --arg projectId "$OLD_PROJECT_ID" \
  --arg title "$NEXT_PROJECT_TITLE" \
  '{query: $query, variables: {input: {projectId: $projectId, title: $title, includeDraftIssues: false}}}')")

NEW_PROJECT_ID=$(echo "$COPY_JSON" | jq -r '.data.copyProjectV2.projectV2.id // empty')
if [[ -z "$NEW_PROJECT_ID" ]]; then
  echo -e "${RED}Error: copyProjectV2 did not return a project id${NC}" >&2
  exit 1
fi
NEW_PROJECT_URL=$(echo "$COPY_JSON" | jq -r '.data.copyProjectV2.projectV2.url // empty')
echo -e "${GREEN}Created project: $NEXT_PROJECT_TITLE ($NEW_PROJECT_URL)${NC}"

# --- Step 4: Enumerate the old project's items with their field values ---

ITEMS_JSON=$(graphql_call "$(jq -n --arg query "$ITEMS_QUERY" --arg id "$OLD_PROJECT_ID" \
  '{query: $query, variables: {id: $id}}')")

# Each row: <item id> <content id> <status> <priority> <size> (tab-separated)
ITEM_ROWS=$(echo "$ITEMS_JSON" | jq -r '
  .data.node.items.nodes[]?
  | [.id, .content.id,
     ([.fieldValues.nodes[]? | select(.field.name == "Status") | .name] | first // ""),
     ([.fieldValues.nodes[]? | select(.field.name == "Priority") | .name] | first // ""),
     ([.fieldValues.nodes[]? | select(.field.name == "Size") | .name] | first // "")]
  | @tsv')

# --- Step 5: Resolve the new project's single-select field and option ids ---

FIELDS_JSON=$(graphql_call "$(jq -n --arg query "$FIELDS_QUERY" --arg id "$NEW_PROJECT_ID" \
  '{query: $query, variables: {id: $id}}')")

# Restore a single-select field value on a moved item. The option ids in the
# copied project differ from the old project's, so they are re-resolved by name.
update_single_select_field() {
  local field_name="$1"
  local option_name="$2"
  local item_id="$3"

  local field_id option_id
  field_id=$(echo "$FIELDS_JSON" | jq -r --arg name "$field_name" \
    '.data.node.fields.nodes[]? | select(.name == $name) | .id // empty')
  option_id=$(echo "$FIELDS_JSON" | jq -r --arg field "$field_name" --arg option "$option_name" \
    '.data.node.fields.nodes[]? | select(.name == $field) | .options[]? | select(.name == $option) | .id // empty')

  if [[ -z "$field_id" ]] || [[ -z "$option_id" ]]; then
    echo -e "${YELLOW}Warning: option '$option_name' not found for field '$field_name' in '$NEXT_PROJECT_TITLE' — value not restored.${NC}"
    return
  fi

  set_board_field_value "$NEW_PROJECT_ID" "$item_id" "$field_id" "$option_id"
}

# --- Step 6: Move every non-Done item ---

MOVED=0
# A herestring always ends in a newline, so an empty ITEM_ROWS would run the
# loop once with empty fields — guard the loop instead.
if [[ -n "$ITEM_ROWS" ]]; then
  while IFS=$'\t' read -r ITEM_ID CONTENT_ID STATUS PRIORITY SIZE; do
    if [[ "$STATUS" == "Done" ]]; then
      continue
    fi

    NEW_ITEM_ID=$(add_board_item "$NEW_PROJECT_ID" "$CONTENT_ID")
    if [[ -z "$NEW_ITEM_ID" ]]; then
      echo -e "${RED}Error: addProjectV2ItemById did not return an item id${NC}" >&2
      exit 1
    fi

    if [[ -n "$STATUS" ]]; then
      update_single_select_field "Status" "$STATUS" "$NEW_ITEM_ID"
    fi
    if [[ -n "$PRIORITY" ]]; then
      update_single_select_field "Priority" "$PRIORITY" "$NEW_ITEM_ID"
    fi
    if [[ -n "$SIZE" ]]; then
      update_single_select_field "Size" "$SIZE" "$NEW_ITEM_ID"
    fi

    graphql_call "$(jq -n --arg query "$DELETE_ITEM_QUERY" \
      --arg projectId "$OLD_PROJECT_ID" \
      --arg itemId "$ITEM_ID" \
      '{query: $query, variables: {input: {projectId: $projectId, itemId: $itemId}}}')" > /dev/null

    if [[ -n "$STATUS" ]]; then
      echo "  Moved item (Status: $STATUS)"
    else
      echo "  Moved item (no Status)"
    fi
    MOVED=$((MOVED + 1))
  done <<< "$ITEM_ROWS"
fi

# --- Summary ---

echo ""
echo -e "${GREEN}Moved $MOVED item(s) from '$CURRENT_PROJECT_TITLE' to '$NEXT_PROJECT_TITLE'${NC}"
echo -e "Next project: $NEW_PROJECT_URL"
echo -e "${YELLOW}Old project left open: $CURRENT_PROJECT_TITLE${NC}"
